/**
 * User authentication types
 */
export interface User {
  id: string | number;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SignupPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface ErrorResponse {
  message: string;
}
