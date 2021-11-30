import { ec } from "elliptic";
import { toHexString } from "./utils";

const EC = new ec("secp256k1");

export const generatePrivateKey = (): string => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

export const getPublicKey = (privateKey: string): string => {
  const key = EC.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex", false);
};

export const importPublicKey = (pub: string): ec.KeyPair => {
  return EC.keyFromPublic(pub, "hex");
};

/**
 * 通过 privateKey 对 Message 进行签名过程。得到 signature
 * 持有 publicKey 者可以对 Message 和 Signature 进行验证
 * @param privateKey
 * @param message
 */
export const getSignature = (privateKey: string, message: string): string => {
  const key = EC.keyFromPrivate(privateKey, "hex");
  const signature = key.sign(message);

  return toHexString(signature.toDER());
};

/**
 * valid address is a valid ecdsa public key in the 04 + X-coordinate + Y-coordinate format
 * @param address
 */
export const isValidAddress = (address: string): boolean => {
  if (address.length !== 130) {
    console.log("invalid public key length");
    return false;
  } else if (address.match("^[a-fA-F0-9]+$") === null) {
    console.log("public key must contain only hex characters");
    return false;
  } else if (!address.startsWith("04")) {
    console.log("public key must start with 04");
    return false;
  }
  return true;
};
