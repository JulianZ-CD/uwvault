"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";

interface ResourceReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  action: 'approve' | 'reject' | 'deactivate' | 'activate';
}

export function ResourceReviewDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  action
}: ResourceReviewDialogProps) {
  const [comment, setComment] = useState("");
  
  const handleConfirm = () => {
    onConfirm(comment);
    setComment("");
    onClose();
  };
  
  const getTitle = () => {
    switch (action) {
      case 'approve':
        return 'Approve Resource';
      case 'reject':
        return 'Reject Resource';
      case 'deactivate':
        return 'Deactivate Resource';
      case 'activate':
        return 'Activate Resource';
      default:
        return 'Review Resource';
    }
  };
  
  const getDescription = () => {
    switch (action) {
      case 'approve':
        return 'Add an optional comment for approving this resource:';
      case 'reject':
        return 'Please provide a reason for rejecting this resource:';
      case 'deactivate':
        return 'Please provide a reason for deactivating this resource:';
      case 'activate':
        return 'Add an optional comment for activating this resource:';
      default:
        return 'Add a comment:';
    }
  };
  
  const isCommentRequired = action === 'reject' || action === 'deactivate';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment here..."
            className="min-h-[100px]"
          />
          {isCommentRequired && comment.trim() === "" && (
            <p className="text-sm text-red-500 mt-1">Comment is required for this action</p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleConfirm}
            disabled={isCommentRequired && comment.trim() === ""}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 