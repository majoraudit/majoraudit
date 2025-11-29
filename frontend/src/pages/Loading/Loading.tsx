"use client";

import { useState, useEffect } from "react";
import { Player } from "@lottiefiles/react-lottie-player";

const loadingMessages = [
  "Teaching the gears to spin faster...",
  "Politely requesting your data to behave...",
  "Convincing the server to wake up...",
  "Dusting off your dashboard...",
  "Warming up the algorithms...",
  "Untangling the data spaghetti...",
  "Bribing the robots with more GPU...",
  "Persuading the numbers to cooperate...",
  "Running a highly scientific vibe check...",
  "Asking the database for ‘just one more thing’...",
  "Calculating... something important probably...",
  "Loading… because teleportation isn’t real yet...",
  "Making sure everything looks smarter than it is...",
  "Summoning your personalized insights...",
  "Optimizing… with questionable confidence...",
  "Turning coffee into computation...",
  "Aligning bits, bytes, and hopes...",
  "Whispering encouragement to the servers...",
  "Preparing dashboard greatness...",
  "Almost ready… pretend you didn’t see this.",
];

function shuffleArray(arr: string[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Loading() {
  const [messages, setMessages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);

  // Shuffle once
  useEffect(() => {
    setMessages(shuffleArray(loadingMessages));
  }, []);

  // Fade + cycle messages
  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      // Fade out
      setOpacity(0);

      // After fade-out finishes, change text and fade back in
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setOpacity(1);
      }, 500); // match transition duration
    }, 2500);

    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Player
          autoplay
          loop
          src="/loading_gears.json"
          style={{ height: 300, width: 300 }}
        />

        <p
          className="text-black font-semibold text-2xl transition-opacity duration-500"
          style={{ opacity }}
        >
          {messages[index]}
        </p>
      </div>
    </div>
  );
}
