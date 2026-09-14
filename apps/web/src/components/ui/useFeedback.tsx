"use client";
import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export function useFeedback() {
  const [message, setMessage] = useState("");
  const dismiss = () => setMessage("");
  return {
    showFeedback: setMessage,
    feedbackDialog: (
      <Modal
        isOpen={Boolean(message)}
        onClose={dismiss}
        title="پیام لقمه"
        footer={<Button onClick={dismiss}>متوجه شدم</Button>}
      >
        <p role="status" className="text-sm">
          {message}
        </p>
      </Modal>
    ),
  };
}
