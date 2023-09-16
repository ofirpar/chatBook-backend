import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { emailSchema, passwordConfirmSchema } from '@auth/schemes/password';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { BadRequestError } from '@global/helpers/error-handler';
import { authService } from '@service/db/auth.service';
import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import crypto from 'crypto';
import { config } from '@root/config';
import { forgotPasswordTemplate } from '@service/emails/templates/forgot-password/forgot-password-template';
import { emailQueue } from '@service/queues/email.queue';
import { IResetPasswordParams } from '@user/interfaces/user.interface';
import moment from 'moment';
import publicIP from 'ip';
import { resetPasswordTemplate } from '@service/emails/templates/reset-password/reset-password-template';

export class Password {
  @joiValidation(emailSchema)
  public async create(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const existingUser: IAuthDocument = await authService.getAuthUserByEmail(email);
    if (!existingUser) {
      throw new BadRequestError('Invalid Credentials');
    }
    const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
    const randomChars: string = randomBytes.toString('hex');
    const now = new Date();
    const hourFromNow: number = now.setHours(now.getHours() + 1);
    await authService.updatePasswordToken(`${existingUser._id}`, randomChars, hourFromNow);

    const resetLink = `${config.CLIENT_URL}/reset-password?token=${randomChars}`;
    const template: string = forgotPasswordTemplate.passwordResetTemplate(existingUser.username!, resetLink);
    emailQueue.addEmailJob('forgotPasswordEmail', {template, receiverEmail: email, subject: 'Reset your password'});
    res.status(HTTP_STATUS.OK).json({message: 'Password reset email sent.'});
  }

  @joiValidation(passwordConfirmSchema)
  public async update(req: Request, res: Response): Promise<void> {
    const { password, confirmPassword } = req.body;
    const {token} = req.params;
    if (password !== confirmPassword) {
      throw new BadRequestError('Passwodrs do not match');
    }
    const existingUser: IAuthDocument = await authService.getUserByPasswordToken(token);
    if (!existingUser) {
      throw new BadRequestError('Reset token expired');
    }

    existingUser.password = password;
    existingUser.passwordResetExpires = undefined;
    existingUser.passwordResetToken = undefined;
    await existingUser.save();

    const templateParams: IResetPasswordParams = {
      username: existingUser.username,
      email: existingUser.email,
      date: moment().format('DD//MM//YYYY HH:mm'),
      ipaddress: publicIP.address()
    };

    const template: string = resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    emailQueue.addEmailJob('forgotPasswordEmail', {template, receiverEmail: existingUser.email, subject: 'Password reset confirmation'});
    res.status(HTTP_STATUS.OK).json({message: 'Password successfully updated.'});
  }
}
