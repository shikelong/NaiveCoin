import { ec } from "elliptic";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import * as _ from "lodash";
import { signTxIn, Transaction } from "./Transaction";
import { generatePrivateKey, getPublicKey } from "../utils/cryptoUtils";
import { UnspentTxOut } from "./UnspentTxOut";
import { TxIn } from "./TxIn";
import { TxOut } from "./TxOut";

export default class Wallet {
  constructor(private privateKeyLocation: string) {
    this._initWallet();
  }
  public getPrivateKey() {
    const buffer = readFileSync(this.privateKeyLocation, "utf8");
    return buffer.toString();
  }

  public getPublicKey() {
    const privateKey = this.getPrivateKey();
    return getPublicKey(privateKey);
  }

  private _initWallet() {
    if (existsSync(this.privateKeyLocation)) {
      return;
    }

    const newPrivateKey = generatePrivateKey();
    writeFileSync(this.privateKeyLocation, newPrivateKey);
  }

  /**
   * 创建交易。
   * 交易可能包含多笔 txIn 和 txOut.
   * @param receiverAddress
   * @param amount
   * @param privateKey
   * @param unspentTxOuts
   * @param txPool
   */
  static createTransaction(
    receiverAddress: string,
    amount: number,
    privateKey: string,
    unspentTxOuts: UnspentTxOut[],
    txPool: Transaction[]
  ): Transaction {
    const senderAddress = getPublicKey(privateKey);

    const senderUnspentTxOuts = unspentTxOuts.filter(
      (utxo) => utxo.address === senderAddress
    );

    const UnSentTxOuts = filterTxPoolTxs(senderUnspentTxOuts, txPool);

    const { includedUnspentTxOuts, leftOverAmount } = findTxOutputsForAmount(
      amount,
      UnSentTxOuts
    );

    const unSignedTxIns = includedUnspentTxOuts.map((utxo) => {
      const txIn = new TxIn();
      txIn.txOutId = utxo.txOutId;
      txIn.txOutIndex = utxo.txOutIndex;
      return txIn;
    });

    const txOuts = createTxOuts(
      receiverAddress,
      senderAddress,
      amount,
      leftOverAmount
    );

    const tx = new Transaction(unSignedTxIns, txOuts);
    tx.id = tx.generateId();

    //计算签名
    tx.txIns = tx.txIns.map((txIn, index) => {
      txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
      return txIn;
    });

    return tx;
  }
}

/**
 * get balance total by address
 * @param address
 * @param ustos
 */
export const getBalance = (address: string, ustos: UnspentTxOut[]): number => {
  let balance = 0;
  for (const tx of ustos) {
    if (tx.address === address) {
      balance += tx.amount;
    }
  }
  return balance;
};

/**
 * get UXTOs / leftOverAmount that can satisfied given amount
 * @param amount
 * @param usersUnspentTxOuts
 */
const findTxOutputsForAmount = (
  amount: number,
  usersUnspentTxOuts: UnspentTxOut[]
): {
  includedUnspentTxOuts: UnspentTxOut[];
  leftOverAmount: number;
} => {
  let curAmount = 0;
  let includedUnspentTxOuts = [];
  for (const usersUnspentTxOut of usersUnspentTxOuts) {
    curAmount += usersUnspentTxOut.amount;
    includedUnspentTxOuts.push(usersUnspentTxOut);
    if (curAmount >= amount) {
      const leftOverAmount = curAmount - amount;
      return {
        includedUnspentTxOuts,
        leftOverAmount,
      };
    }
  }
  throw new Error("Not enough funds");
};

const filterTxPoolTxs = (
  unspentTxOuts: UnspentTxOut[],
  transactionPool: Transaction[]
): UnspentTxOut[] => {
  const txIns: TxIn[] = _.chain(transactionPool)
    .map((tx: Transaction) => tx.txIns)
    .flatten()
    .value();
  const removable: UnspentTxOut[] = [];
  for (const unspentTxOut of unspentTxOuts) {
    const txIn = _.find(txIns, (aTxIn: TxIn) => {
      return (
        aTxIn.txOutIndex === unspentTxOut.txOutIndex &&
        aTxIn.txOutId === unspentTxOut.txOutId
      );
    });

    if (txIn === undefined) {
    } else {
      removable.push(unspentTxOut);
    }
  }

  return _.without(unspentTxOuts, ...removable);
};

/**
 * 创建到收款方的输出，如果存在找零，则对自身地址创建一笔输出
 * @param receiverAddress
 * @param myAddress
 * @param amount
 * @param leftOverAmount
 */
const createTxOuts = (
  receiverAddress: string,
  myAddress: string,
  amount,
  leftOverAmount: number
) => {
  const txOuts = [new TxOut(receiverAddress, amount)];
  if (leftOverAmount > 0) {
    txOuts.push(new TxOut(myAddress, leftOverAmount));
  }
  return txOuts;
};

export const walletIns = new Wallet("./private_key");

