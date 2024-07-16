import jwt from 'jsonwebtoken';

const SECRET_KEY = 'your_secret_key';

export const generateToken = (payload: object): string => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (e) {
    return null;
  }
};
