import React, { useState } from 'react';
import * as dataService from '../services/dataService';

interface FeedbackModalProps {
  boothId: string;
  onSubmit?: (rating: number, feedback: string) => void;
  onClose: () => void;
}

const Star: React.FC<{ filled: boolean; onClick: () => void; onMouseEnter?: () => void }> = ({
  filled,
  onClick,
  onMouseEnter,
}) => (
  <svg
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    className={`w-10 h-10 cursor-pointer transition-transform transform hover:scale-125 ${
      filled ? 'text-yellow-400' : 'text-gray-600'
    }`}
    fill="currentColor"
    viewBox="0 0 20 20"
    role="img"
    aria-label={filled ? 'filled star' : 'empty star'}
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const FeedbackModal: React.FC<FeedbackModalProps> = ({ boothId, onSubmit, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating <= 0 || isSubmitting) return;

    // Enforce minimum 20 characters
    if (feedback.trim().length < 20) {
      setErr('Feedback must be at least 20 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErr(null);

      await dataService.addVisit(boothId, rating, feedback);
      onSubmit?.(rating, feedback);
      onClose();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? 'Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  const remaining = feedback.trim().length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Close feedback form"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-center mb-2">
          Feedback for <span className="text-purple-400">{boothId}</span>
        </h2>
        <p className="text-center text-gray-400 mb-6">Your feedback helps us improve!</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
              1. How would you rate this demo?
            </label>
            <div className="flex justify-center space-x-2" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  filled={(hoverRating || rating) >= star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                />
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-300">
              2. How could you apply this solution to your use case?
              <br />
              <span className="text-xs text-gray-400">(Minimum 20 characters)</span>
            </label>
            <textarea
              id="feedback"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Automate monthly reporting, improve data analysis..."
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{remaining < 20 ? `Need ${20 - remaining} more characters` : 'Ready to submit'}</span>
              <span>{remaining}/20</span>
            </div>
          </div>

          {/* Error Message */}
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={rating === 0 || remaining < 20 || isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
