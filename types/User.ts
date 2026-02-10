export interface User {
  userId: string;
  email: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
}

export interface CreateUserResponse {
  userId: string;
  email: string;
  createdAt: string;
}
