import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";
import axios from "axios";
import ObjectsToCsv from "objects-to-csv";

interface IData {
  timestamp: number;
  transaction_type: "DEPOSIT" | "WITHDRAWAL";
  token: string;
  amount: number;
}

interface IAxiosResponse {
  USD: number;
}

const dataPath = path.resolve(__dirname, "..", "data", "transactions.csv");
const headers = ["timestamp", "transaction_type", "token", "amount"];
const dataContent = fs.readFileSync(dataPath, { encoding: "utf-8" });

const apiKey =
  "2d67f395ee03d55814b495544ef0e26e5cc59e02967425ba30d766fda36ddcc7";

const config = {
  headers: {
    authorization: `Apikey ${apiKey}`,
  },
};
const apiInstance = axios.create({
  baseURL: "https://min-api.cryptocompare.com",
  timeout: 5000,
});

parse(
  dataContent,
  {
    delimiter: ",",
    columns: headers,
  },
  async (error, results: IData[]) => {
    if (error) {
      console.error(error);
    }

    const promises = results.slice(1).map(async (result) => {
      // slice except csv header
      const { timestamp, transaction_type, token, amount } = result;

      const axiosRes = await apiInstance.get<IAxiosResponse>(
        `/data/price?fsym=${token}&tsyms=USD`,
        config // add ApiKey header
      );

      if (axiosRes.status !== 200) {
        return { error: axiosRes.data };
      }

      const { USD } = axiosRes.data;
      const transactionAmount = amount * USD;

      return {
        timestamp,
        transaction_type,
        token,
        amount,
        usd: transactionAmount,
      };
    });

    const updatedData = await Promise.all(promises);

    const csv = new ObjectsToCsv(updatedData);
    await csv.toDisk("./test.csv");
  }
);
