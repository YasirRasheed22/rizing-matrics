//@ts-nocheck
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react'; // ya jo warning icon use kar rahe ho
import api from '../api';

export const confirmDeleteVoicemail = (
  voicemailId: string,
  fromNumber?: string, // optional: message mein number dikha sakte ho
  onDeleteSuccess: () => void // list update callback
) => {
  toast.custom(
    (t) => (
      <div
        className={`max-w-md w-full bg-white shadow-2xl rounded-2xl p-4 border border-red-100 ${
          t.visible ? 'animate-[fadeIn_0.3s_ease-out]' : 'animate-[fadeOut_0.2s_ease-in]'
        }`}
      >
        <div className="flex items-start gap-5">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-0">
              Delete Voicemail?
            </h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Are you sure you want to delete this voicemail
              {fromNumber ? ` from ${fromNumber}` : ''}?
              <br />
              <span className="font-medium text-red-600">This action cannot be undone.</span>
            </p>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded transition"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  toast.dismiss(t.id); // Confirm modal band karo

                  const loadingId = toast.loading("Deleting voicemail...");

                  try {
                    // Tumhara delete API call
                    await api.delete(`/voice/voicemails/${voicemailId}`); // axios/fetch adjust kar lo

                    toast.success("Voicemail deleted successfully!", { id: loadingId });

                    // List update (optimistic)
                    onDeleteSuccess();

                  } catch (err: any) {
                    console.error("Delete failed:", err);
                    toast.error(
                      err.response?.data?.message || "Failed to delete voicemail",
                      { id: loadingId }
                    );
                  }
                }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: Infinity,     // User click tak rahega
      position: "top-center", // Modal jaisa center feel
    }
  );
};