'use client'

import { useState } from 'react'

export default function HelpfulWidget() {
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  return (
    <div className="helpful-widget">
      {vote ? (
        <p className="helpful-thanks">
          {vote === 'up' ? '🙌 Glad it helped!' : "📝 Thanks — we'll keep improving!"}
        </p>
      ) : (
        <>
          <p className="helpful-label">Was this listacle helpful?</p>
          <div className="helpful-buttons">
            <button onClick={() => setVote('up')} className="helpful-btn helpful-yes">👍 Yes, loved it</button>
            <button onClick={() => setVote('down')} className="helpful-btn helpful-no">👎 Not really</button>
          </div>
        </>
      )}
    </div>
  )
}
