import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { PayoutMethod, PayoutStatus } from './Payout';

export interface ITrainerPayout extends Document {
    trainerId:   Types.ObjectId;
    amount:      number;
    method:      PayoutMethod;
    accountNumber: string;
    status:      PayoutStatus;
    adminNote?:  string;
    processedBy?: Types.ObjectId;
    processedAt?: Date;
    ledgerEntryIds: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const TrainerPayoutSchema = new Schema<ITrainerPayout>(
    {
        trainerId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Trainer ID is required'],
        },
        amount: {
            type:     Number,
            required: [true, 'Amount is required'],
            min:      [1, 'Payout amount must be at least EGP 1'],
        },
        method: {
            type:     String,
            enum:     Object.values(PayoutMethod),
            required: [true, 'Payout method is required'],
        },
        accountNumber: {
            type:      String,
            required:  [true, 'Account number is required'],
            trim:      true,
            minlength: [6,  'Account number is too short'],
            maxlength: [30, 'Account number is too long'],
        },
        status: {
            type:    String,
            enum:    Object.values(PayoutStatus),
            default: PayoutStatus.PENDING,
        },
        adminNote: {
            type:      String,
            maxlength: [500, 'Admin note cannot exceed 500 characters'],
        },
        processedBy: {
            type: Schema.Types.ObjectId,
            ref:  'User',
        },
        processedAt: {
            type: Date,
        },
        ledgerEntryIds: {
            type:     [Schema.Types.ObjectId],
            ref:      'LedgerEntry',
            default:  [],
        },
    },
    {
        timestamps: true,
    }
);

TrainerPayoutSchema.index({ trainerId: 1, status: 1 });
TrainerPayoutSchema.index({ status: 1, createdAt: -1 });

const TrainerPayout: Model<ITrainerPayout> =
    mongoose.models.TrainerPayout ||
    mongoose.model<ITrainerPayout>('TrainerPayout', TrainerPayoutSchema);

export default TrainerPayout;
