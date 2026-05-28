import mongoose from "mongoose";
import Transaction from "../models/transaction.model.js";
import DayWiseTransaction from "../models/dailyTransaction.model.js";

const updateDayWiseSummary = async (transaction, operation) => {
  const { user, date, type, amount, _id } = transaction;

  if (!mongoose.isValidObjectId(_id)) {
    throw new Error("Invalid transaction ID");
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  let dayWiseTransaction = await DayWiseTransaction.findOne({
    user,
    date: startOfDay,
  });

  if (operation === "create") {
    if (!dayWiseTransaction) {
      dayWiseTransaction = new DayWiseTransaction({
        user,
        date: startOfDay,
        totalIncome: type === "income" ? amount : 0,
        totalExpense: type === "expense" ? amount : 0,
        transactions: [_id],
      });
    } else {
      if (type === "income") {
        dayWiseTransaction.totalIncome += amount;
      } else if (type === "expense") {
        dayWiseTransaction.totalExpense += amount;
      }
      dayWiseTransaction.transactions.push(_id);
    }
  } else if (operation === "update") {
    if (!dayWiseTransaction) {
      throw new Error("DayWiseTransaction not found for update");
    }
    const transactions = await Transaction.find({
      _id: { $in: dayWiseTransaction.transactions },
    });
    dayWiseTransaction.totalIncome = transactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    dayWiseTransaction.totalExpense = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  } else if (operation === "delete") {
    if (!dayWiseTransaction) {
      return;
    }
    dayWiseTransaction.transactions = dayWiseTransaction.transactions.filter(
      (txId) => txId.toString() !== _id.toString()
    );
    const transactions = await Transaction.find({
      _id: { $in: dayWiseTransaction.transactions },
    });
    dayWiseTransaction.totalIncome = transactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    dayWiseTransaction.totalExpense = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
    if (dayWiseTransaction.transactions.length === 0) {
      await DayWiseTransaction.deleteOne({ _id: dayWiseTransaction._id });
      return;
    }
  } else {
    throw new Error("Invalid operation type");
  }

  await dayWiseTransaction.save();
};

export default updateDayWiseSummary;
