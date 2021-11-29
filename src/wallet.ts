import { ec } from "elliptic";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import * as _ from "lodash";
import {
  getPublicKey,
  getTransactionId,
  signTxIn,
  Transaction,
  TxIn,
  TxOut,
  UnspentTxOut,
} from "./transaction";

const EC = new ec("secp256k1");
const privateKeyLocation = "./private_key";

const getPrivateFromWallet = (): string => {
  const buffer = readFileSync(privateKeyLocation, "utf8");
  return buffer.toString();
};

const getPublicFromWallet = (): string => {
  const privateKey = getPrivateFromWallet();
  const key = EC.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex", false);
};

const generatePrivateKey = (): string => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const initWallet = () => {
  if (existsSync(privateKeyLocation)) {
    return;
  }

  const newPrivateKey = generatePrivateKey();
  writeFileSync(privateKeyLocation, newPrivateKey);
};

const getBalance = (address: string, ustos: UnspentTxOut[]): number => {
  let balance = 0;
  for (const tx of ustos) {
    if (tx.address === address) {
      balance += tx.amount;
    }
  }
  return balance;
};

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

const filterTxPoolTxs = (unspentTxOuts: UnspentTxOut[], transactionPool: Transaction[]): UnspentTxOut[] => {
  const txIns: TxIn[] = _.chain(transactionPool)
    .map((tx: Transaction) => tx.txIns)
    .flatten()
    .value();
  const removable: UnspentTxOut[] = [];
  for (const unspentTxOut of unspentTxOuts) {
    const txIn = _.find(txIns, (aTxIn: TxIn) => {
      return aTxIn.txOutIndex === unspentTxOut.txOutIndex && aTxIn.txOutId === unspentTxOut.txOutId;
    });

    if (txIn === undefined) {

    } else {
      removable.push(unspentTxOut);
    }
  }

  return _.without(unspentTxOuts, ...removable);
};

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

const createTransaction = (
  receiverAddress: string,
  amount: number,
  privateKey: string,
  unspentTxOuts: UnspentTxOut[],
  txPool: Transaction[]
): Transaction => {
  console.log("txPool: %s", JSON.stringify(txPool));
  const tx = new Transaction();
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
  tx.txOuts = txOuts;
  tx.txIns = unSignedTxIns;
  tx.id = getTransactionId(tx);

  tx.txIns = tx.txIns.map((txIn, index) => {
    txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
    return txIn;
  });

  return tx;
};

export {
  createTransaction,
  getPublicFromWallet,
  getPrivateFromWallet,
  getBalance,
  generatePrivateKey,
  initWallet,
  filterTxPoolTxs
};
