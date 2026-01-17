import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * Category Document Interface
 */
export interface ICategory extends Document {
    name: string;        // "Technology & Coding"
    slug: string;        // "technology" (URL-friendly)
    icon?: string;       // Lucide icon name (e.g., "code")
    description?: string;
}

/**
 * Category Schema
 */
const CategorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: [true, 'Category slug is required'],
            unique: true,
            lowercase: true,
            trim: true,
        },
        icon: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast lookups
CategorySchema.index({ slug: 1 });

/**
 * Category Model
 * Force delete cached model to ensure proper registration
 */
if (mongoose.models.Category) {
    delete mongoose.models.Category;
}

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
