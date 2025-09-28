'use client';

/**
 * DeleteConversationDialog - AlertDialog component untuk konfirmasi delete conversation
 *
 * DESIGN COMPLIANCE:
 * - Menggunakan shadcn/ui AlertDialog dengan styling yang konsisten
 * - Bahasa Indonesia sesuai dengan tone aplikasi Makalah
 * - Destructive action button dengan proper color scheme
 * - Loading state untuk operasi async
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface DeleteConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  conversationTitle?: string;
}

export const DeleteConversationDialog: React.FC<DeleteConversationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
  conversationTitle,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-[3px] sm:rounded-[3px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Percakapan</AlertDialogTitle>
          <AlertDialogDescription>
            Yakin ingin menghapus percakapan ini?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              'Hapus'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConversationDialog;