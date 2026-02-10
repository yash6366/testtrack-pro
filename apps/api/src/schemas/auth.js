import z from 'zod';

const SignupRoleSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['DEVELOPER', 'TESTER'])
);

export const SignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: SignupRoleSchema.default('DEVELOPER'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const AuthResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    email: z.string(),
  }),
  token: z.string(),
});
