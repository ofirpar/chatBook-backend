import { IUserDocument } from '@user/interfaces/user.interface';
import { BaseCache } from './base.cache';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';

const userKeys = [
  '_id',
  'uId',
  'username',
  'email',
  'avatarColor',
  'profilePicture',
  'bgImageId',
  'bgImageVersion',
  'work',
  'location',
  'school',
  'quote'
];
const userStringifiedKeys = ['blocked', 'blockedBy', 'postsCount', 'followersCount', 'followingCount', 'notifications', 'social'];
export class UserCache extends BaseCache {
  constructor() {
    super('userCache');
  }

  public async saveToCache(key: string, userId: string, createdUser: IUserDocument): Promise<void> {
    const createdDate = new Date();
    // const createdUserKeys = Object.keys(createdUser);
    const allUserKeys = [...userKeys, ...userStringifiedKeys];
    const dataToSave: string[] = allUserKeys.reduce((rv: string[], curr: string) => {
      rv.push(curr);
      const value = (createdUser as any)[curr]?.toString();
      if (value && value === '[object Object]') {
        rv.push(JSON.stringify((createdUser as any)[curr]));
      } else {
        rv.push(value);
      }
      return rv;
    }, []);
    dataToSave.push('createdAt', createdDate.toString());
    console.log('### DATA', dataToSave);

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.ZADD('user', { score: parseInt(userId, 10), value: `${key}` });
      await this.client.HSET(`users:${key}`, dataToSave);
    } catch (error) {
      this.log.error(error);
      throw new ServerError('Redis save error');
    }
  }

  public async getUserFromCache(userId: string): Promise<IUserDocument | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: IUserDocument = (await this.client.HGETALL(`users:${userId}`)) as unknown as IUserDocument;
      response.createdAt = new Date(Helpers.parseJson(`${response.createdAt}`));
      userStringifiedKeys.forEach((key: string) => {
        if (key in response) {
          (response as any)[key] = Helpers.parseJson(`${(response as any)[key]}`);
        }
      });
      return response;
    } catch (error) {
      this.log.error(error);
      throw new ServerError('Redis save error');
    }
  }
}
