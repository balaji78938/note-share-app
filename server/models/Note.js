import mongoose from 'mongoose';

const editSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    editedAt: {
      type: Date,
      default: Date.now
    },
    summary: {
      type: String,
      default: 'Updated note'
    }
  },
  { _id: false }
);

const sharedUserSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    canEdit: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    content: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    ownerUsername: {
      type: String,
      required: true
    },
    sharedWith: [sharedUserSchema],
    editHistory: [editSchema]
  },
  { timestamps: true }
);

export default mongoose.model('Note', noteSchema);
