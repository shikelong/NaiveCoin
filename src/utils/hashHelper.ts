import * as CryptoJS from "crypto-js";
import Block from "../Block";
import { Transaction } from "../Transaction";

export const calculateHash = (
  params: {
    index: number,
    previousHash: string,
    timeStamp: number,
    data: Transaction[],
    difficulty: number,
    nonce: number
  }
): string => {
  const { index, previousHash, timeStamp, data, difficulty, nonce } = params;
  return CryptoJS.SHA256(index + previousHash + timeStamp + data + difficulty + nonce).toString();
};

export const calculateHashForBlock = (block: Block): string => {
  return calculateHash(
    {
      index: block.index,
      previousHash: block.previousHash,
      timeStamp: block.timeStamp,
      data: block.data,
      difficulty: block.difficulty,
      nonce: block.nonce
    }
  );
};
