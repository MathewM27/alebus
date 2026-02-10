import { CreateUserRequest, CreateUserResponse } from '@/types/User';
import { apiClient } from './client';

export async function createUser(email: string): Promise<CreateUserResponse> {
  const request: CreateUserRequest = { email };
  return apiClient.post<CreateUserResponse>('/users/create', request);
}
