import mongoose from 'mongoose'

const alertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['Searching', 'Volunteer Assigned', 'On the Way', 'Reached'],
      default: 'Searching',
      index: true,
    },
    assignedVolunteer: {
      type: String,
      default: null,
    },
    assignedVolunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    onTheWayAt: {
      type: Date,
      default: null,
    },
    reachedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema)

export default Alert
