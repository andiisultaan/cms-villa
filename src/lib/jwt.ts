import { JwtPayload, sign, verify } from "jsonwebtoken";
import * as jose from "jose";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "rahasia";

export const signToken = (payload: JwtPayload) => sign(payload, JWT_SECRET_KEY);

export const verifyToken = (token: string) => verify(token, JWT_SECRET_KEY);

export const verifyTokenJose = async <T>(token: string) => {
  const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
  const payloadJose = await jose.jwtVerify<T>(token, secretKey);

  return payloadJose.payload;
};
