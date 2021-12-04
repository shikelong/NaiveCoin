import _ from "lodash";
import {
  getPublicKey,
  getSignature,
  importPublicKey,
} from "../utils/cryptoUtils";
import { COINBASE_AMOUNT } from "../utils/consts";
import { TxIn } from "./TxIn";
import { TxOut } from "./TxOut";
import { UnspentTxOut } from "./UnspentTxOut";
import CryptoJS from "crypto-js";

class Transaction {
  //hash of the transaction contents(ins, outs)
  //txIds will be signed to prevent modified.
  private _id: string;
  get id() {
    return this._id;
  }
  set id(v) {
    this._id = v;
  }

  public txIns: TxIn[];
  public txOuts: TxOut[];

  constructor();
  constructor(_txIns: TxIn[], _txOuts: TxOut[]);
  constructor(_txIns?: TxIn[], _txOuts?: TxOut[]) {
    if (_txIns && _txOuts) {
      this.txIns = _txIns ?? [];
      this.txOuts = _txOuts ?? [];
      this._id = this.generateId();
    } else {
    }
  }

  /**
   * id = Hash(txInContent + txOutContent)
   */
  public generateId(): string {
    const txInContent: string = this.txIns
      .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
      .reduce((a, b) => a + b, "");

    const txOutContent: string = this.txOuts
      .map((txOut: TxOut) => txOut.address + txOut.amount)
      .reduce((a, b) => a + b, "");

    return CryptoJS.SHA256(txInContent + txOutContent).toString();
  }

  public isValid(): boolean {
    if (typeof this.id !== "string") {
      console.log("transaction Id missing");
      return false;
    }
    if (!(this.txIns instanceof Array)) {
      console.log("invalid txIns type in transaction");
      return false;
    }
    if (_.some(this.txIns, (txInput) => !txInput.isValid())) {
      return false;
    }

    if (!(this.txOuts instanceof Array)) {
      console.log("invalid txIns type in transaction");
      return false;
    }

    return _.every(this.txOuts, (txOut) => txOut.isValid());
  }

  /**
   * 铸币交易
   * @param address
   * @param blockIndex
   */
  static getCoinbaseTransaction(
    address: string,
    blockIndex: number
  ): Transaction {
    const txIn: TxIn = new TxIn();
    txIn.signature = "";
    txIn.txOutId = "";
    txIn.txOutIndex = blockIndex;

    const transaction = new Transaction(
      [txIn],
      [new TxOut(address, COINBASE_AMOUNT)]
    );
    transaction.id = transaction.generateId();
    return transaction;
  }
}

export const validateTransaction = (
  transaction: Transaction,
  aUnspentTxOuts: UnspentTxOut[]
): boolean => {
  if (transaction.generateId() !== transaction.id) {
    console.log("invalid tx id: " + transaction.id);
    return false;
  }
  const hasValidTxIns: boolean = transaction.txIns
    .map((txIn) => validateTxIn(txIn, transaction, aUnspentTxOuts))
    .reduce((a, b) => a && b, true);

  if (!hasValidTxIns) {
    console.log("some of the txIns are invalid in tx: " + transaction.id);
    return false;
  }

  const totalTxInValues: number = transaction.txIns
    .map((txIn) => getTxInAmount(txIn, aUnspentTxOuts))
    .reduce((a, b) => a + b, 0);

  const totalTxOutValues: number = transaction.txOuts
    .map((txOut) => txOut.amount)
    .reduce((a, b) => a + b, 0);

  if (totalTxOutValues !== totalTxInValues) {
    console.log(
      "totalTxOutValues !== totalTxInValues in tx: " + transaction.id
    );
    return false;
  }

  return true;
};

const validateBlockTransactions = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[],
  blockIndex: number
): boolean => {
  const coinbaseTx = aTransactions[0];
  if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
    console.log("invalid coinbase transaction: " + JSON.stringify(coinbaseTx));
    return false;
  }

  //check for duplicate txIns. Each txIn can be included only once
  const txIns: TxIn[] = _(aTransactions)
    .map((tx) => tx.txIns)
    .flatten()
    .value();

  if (hasDuplicates(txIns)) {
    return false;
  }

  // all but coinbase transactions
  const normalTransactions: Transaction[] = aTransactions.slice(1);
  return normalTransactions
    .map((tx) => validateTransaction(tx, aUnspentTxOuts))
    .reduce((a, b) => a && b, true);
};

const hasDuplicates = (txIns: TxIn[]): boolean => {
  const groups = _.countBy(txIns, (txIn) => txIn.txOutId + txIn.txOutId);
  return _(groups)
    .map((value, key) => {
      if (value > 1) {
        console.log("duplicate txIn: " + key);
        return true;
      } else {
        return false;
      }
    })
    .includes(true);
};

const validateCoinbaseTx = (
  transaction: Transaction,
  blockIndex: number
): boolean => {
  if (transaction == null) {
    console.log(
      "the first transaction in the block must be coinbase transaction"
    );
    return false;
  }
  if (transaction.generateId() !== transaction.id) {
    console.log("invalid coinbase tx id: " + transaction.id);
    return false;
  }
  if (transaction.txIns.length !== 1) {
    console.log("one txIn must be specified in the coinbase transaction");
    return;
  }
  if (transaction.txIns[0].txOutIndex !== blockIndex) {
    console.log("the txIn signature in coinbase tx must be the block height");
    return false;
  }
  if (transaction.txOuts.length !== 1) {
    console.log("invalid number of txOuts in coinbase transaction");
    return false;
  }
  if (transaction.txOuts[0].amount != COINBASE_AMOUNT) {
    console.log("invalid coinbase amount in coinbase transaction");
    return false;
  }
  return true;
};

const validateTxIn = (
  txIn: TxIn,
  transaction: Transaction,
  aUnspentTxOuts: UnspentTxOut[]
): boolean => {
  const referencedUTxOut: UnspentTxOut = aUnspentTxOuts.find(
    (uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutId === txIn.txOutId
  );
  if (referencedUTxOut == null) {
    console.log("referenced txOut not found: " + JSON.stringify(txIn));
    return false;
  }
  const address = referencedUTxOut.address;

  return importPublicKey(address).verify(transaction.id, txIn.signature);
};

const getTxInAmount = (txIn: TxIn, aUnspentTxOuts: UnspentTxOut[]): number => {
  return findUnspentTxOut(txIn.txOutId, txIn.txOutIndex, aUnspentTxOuts).amount;
};

const findUnspentTxOut = (
  transactionId: string,
  index: number,
  uxtos: UnspentTxOut[]
): UnspentTxOut => {
  return uxtos.find(
    (uxto) => uxto.txOutId === transactionId && uxto.txOutIndex === index
  );
};

const signTxIn = (
  transaction: Transaction,
  txInIndex: number,
  privateKey: string,
  aUnspentTxOuts: UnspentTxOut[]
): string => {
  const txIn: TxIn = transaction.txIns[txInIndex];

  const dataToSign = transaction.id;
  const referencedUnspentTxOut: UnspentTxOut = findUnspentTxOut(
    txIn.txOutId,
    txIn.txOutIndex,
    aUnspentTxOuts
  );
  if (referencedUnspentTxOut == null) {
    console.log("could not find referenced txOut");
    throw Error();
  }
  if (getPublicKey(privateKey) !== referencedUnspentTxOut.address) {
    console.log(
      "trying to sign an input with private" +
        " key that does not match the address that is referenced in txIn"
    );
    throw Error();
  }

  return getSignature(privateKey, dataToSign);
};

const updateUnspentTxOuts = (
  newTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut[] => {
  const newUnspentTxOuts: UnspentTxOut[] = newTransactions
    .map((t) => {
      return t.txOuts.map(
        (txOut, index) =>
          new UnspentTxOut(t.id, index, txOut.address, txOut.amount)
      );
    })
    .reduce((a, b) => a.concat(b), []);

  const consumedTxOuts: UnspentTxOut[] = newTransactions
    .map((t) => t.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

  const resultingUnspentTxOuts = aUnspentTxOuts
    .filter(
      (uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)
    )
    .concat(newUnspentTxOuts);

  return resultingUnspentTxOuts;
};

const processTransactions = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[],
  blockIndex: number
) => {
  if (_.some(aTransactions, (tx) => !tx.isValid())) {
    return null;
  }

  if (!validateBlockTransactions(aTransactions, aUnspentTxOuts, blockIndex)) {
    console.log("invalid block transactions");
    return null;
  }
  return updateUnspentTxOuts(aTransactions, aUnspentTxOuts);
};

export { processTransactions, signTxIn, Transaction };
