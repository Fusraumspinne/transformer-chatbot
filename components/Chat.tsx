"use client"

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };

export default function Chat({ messages }: { messages: Message[] }) {
  const empty = messages.length === 0;

  useEffect(() => {
    if ((window as any).MathJax) (window as any).MathJax.typeset();
  }, [messages]);

  return (
    <div className={`flex-1 p-6 max-w-[960px] w-full ${empty ? 'flex flex-col items-center justify-end' : 'space-y-4'}`}>
      {empty ? (
        <div className="text-xl">Bereit</div>
      ) : (
        messages.map((msg, i) => (
          <div key={`message-${i}`} className="flex items-start space-x-4">
            {msg.role === 'assistant' ? (
              <>
                <div className="h-6 w-6 min-h-6 min-w-6 my-3 text-gray-200" />
                <div className="bg-gray-900 border border-blue-950 rounded-4xl p-4">
                  <div className="min-h-6 text-gray-800 dark:text-gray-200 overflow-wrap-anywhere">
                    {msg.content.length > 0 ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      <span className="h-6 flex items-center gap-1">
                        <span className="w-2 h-2 bg-gradient-to-r from-gray-900 to-blue-950 rounded-full animate-pulse"></span>
                        <span className="w-2 h-2 bg-gradient-to-r from-gray-900 to-blue-950 rounded-full animate-pulse animation-delay-200"></span>
                        <span className="w-2 h-2 bg-gradient-to-r from-gray-900 to-blue-950 rounded-full animate-pulse animation-delay-400"></span>
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-6 w-6 min-h-6 min-w-6 my-3 text-gray-200" />
                <div className="bg-blue-950 text-grey-200 rounded-4xl p-4">
                  <p className="min-h-6 overflow-wrap-anywhere">{msg.content}</p>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}