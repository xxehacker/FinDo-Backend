import { ApiResponse } from "@/../../utils/ApiResponse.js";
import { asyncHandler } from "@/../../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";
import DayWiseTransaction from "../models/dailyTransaction.model.js"; 

const handleDayWiseTransaction = asyncHandler(async (req, res) => {
  const {
    type,
    amount,
    description,
    category,
    date,
    bankAccount,
    transactionMethod,
    transactionStatus,
    notes,
    timeOFDay,
  } = req.body;

  try {
    //! Validate required fields
    if (!type || !amount || !category || !date) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Missing required fields."));
    }

    //! Create transaction
    const transaction = await Transaction.create({
      type,
      amount,
      description: description || "Day Wise Transaction",
      category,
      date,
      bankAccount: bankAccount || null,
      transactionMethod,
      transactionStatus,
      notes,
      user: req?.user?.id,
      timeOFDay,
    });

    //! Find or create DayWiseTransaction for this date & user
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    let dayWiseDoc = await DayWiseTransaction.findOne({
      user: req.user.id,
      date: startOfDay,
    });

    if (!dayWiseDoc) {
      dayWiseDoc = await DayWiseTransaction.create({
        user: req.user.id,
        date: startOfDay,
        totalIncome: 0,
        totalExpense: 0,
        breakdown: [],
      });
    }

    //! Update totals
    if (type === "income") dayWiseDoc.totalIncome += amount;
    if (type === "expense") dayWiseDoc.totalExpense += amount;

    //! Push transaction details into breakdown
    dayWiseDoc.breakdown.push({
      category,
      type,
      amount,
      timeOfDay: timeOFDay,
      transactions: [transaction._id],
    });

    await dayWiseDoc.save();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { transaction, dayWiseSummary: dayWiseDoc },
          "Day-wise transaction created and summary updated."
        )
      );
  } catch (error) {
    console.error("DayWiseTransaction Error:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, `Internal Server Error: ${error.message}`)
      );
  }
});

export default handleDayWiseTransaction;
