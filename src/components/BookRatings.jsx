import { useId, useState } from 'react';

export function RatingStars({ value = 5 }) {
  return <span className="book-rating-stars" aria-hidden="true">
    {[1, 2, 3, 4, 5].map(star => <svg key={star} viewBox="0 0 24 24" fill={value >= star ? 'currentColor' : 'none'}>
      <path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2L3.2 9.6l6-.9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>)}
  </span>;
}

export function BookRatingSummary({ onOpen, title }) {
  return <button type="button" className="book-rating-summary" onClick={onOpen}
    aria-label={`Preview ratings for ${title}`}>
    <RatingStars />
    <span>Reader ratings</span>
  </button>;
}

export default function BookRatingPreview() {
  const [rating, setRating] = useState(0);
  const previewId = useId();
  return <section className="book-reviews" aria-labelledby={`${previewId}-heading`}>
    <div className="book-reviews-heading"><h4 id={`${previewId}-heading`}>Rate this book</h4></div>
    <div className="book-review-form">
      <fieldset aria-describedby={`${previewId}-notice`}>
        <legend>Your rating</legend>
        <div className="book-star-picker">
          {[1, 2, 3, 4, 5].map(value => <label key={value} className={value <= rating ? 'is-selected' : ''}>
            <input type="radio" name={`${previewId}-rating`} value={value} checked={rating === value}
              onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} />
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2L3.2 9.6l6-.9Z" /></svg>
          </label>)}
          <span aria-live="polite">{rating ? ['', 'Not for me', 'It was okay', 'A good read', 'Really enjoyed it', 'Loved it'][rating] : 'Choose your stars'}</span>
        </div>
      </fieldset>
      <p id={`${previewId}-notice`} className="book-rating-preview-note">Visual preview only. Your selection isn’t saved.</p>
    </div>
  </section>;
}
