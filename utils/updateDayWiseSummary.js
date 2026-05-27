import DayWiseTransaction from "../features/transaction/models/dailyTransaction.model.js";
import Transaction from "../features/transaction/models/transaction.model.js";

//! Helper function
const updateDayWiseSummary = async (transaction, operation) => {
  try {
    const { user, date, type, amount, _id } = transaction;

    // Normalize date to start of day (ignoring time for grouping)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    // Find existing DayWiseTransaction for the user and date
    let dayWiseTransaction = await DayWiseTransaction.findOne({
      user,
      date: startOfDay,
    });

    if (operation === "create") {
      if (!dayWiseTransaction) {
        // Create new DayWiseTransaction if it doesn't exist
        dayWiseTransaction = new DayWiseTransaction({
          user,
          date: startOfDay,
          totalIncome: type === "income" ? amount : 0,
          totalExpense: type === "expense" ? amount : 0,
          transactions: [_id],
        });
      } else {
        // Update existing DayWiseTransaction
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
      // Recalculate totals by fetching all transactions (since amount or type may have changed)
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
        return; // No summary to update
      }
      // Remove transaction ID from array
      dayWiseTransaction.transactions = dayWiseTransaction.transactions.filter(
        (txId) => txId.toString() !== _id.toString()
      );
      // Recalculate totals
      const transactions = await Transaction.find({
        _id: { $in: dayWiseTransaction.transactions },
      });
      dayWiseTransaction.totalIncome = transactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + tx.amount, 0);
      dayWiseTransaction.totalExpense = transactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + tx.amount, 0);
      // Delete if no transactions remain
      if (dayWiseTransaction.transactions.length === 0) {
        await DayWiseTransaction.deleteOne({ _id: dayWiseTransaction._id });
        return;
      }
    } else {
      throw new Error("Invalid operation type");
    }

    // Save the updated DayWiseTransaction
    await dayWiseTransaction.save();
  } catch (error) {
    console.error("Error updating DayWiseTransaction:", error);
    throw error; // Let the caller handle the error
  }
};

export default updateDayWiseSummary;
