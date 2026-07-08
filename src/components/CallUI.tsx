// src/components/CallUI.tsx
//@ts-nocheck

import { ActiveCallBar } from "./ActiveCallBar";
import NotesSidebar from "./NotesSidebar";
import TransferModal from "./TransferModalv1";
import LeadSaleModal from "./LeadSaleModalv1";
import { BlockNumberModal } from "./BlockNumberModal";
import { ActiveCallDummy } from "./ActiveCallDummy";
import IncomingCallWindow from "./IncomingModalWindow";
import AgentAutoDialPanel from "./AgentAutoDialPanel";

export default function CallUI({
  call,
  user,
  onAction,
}) {
    console.log(call)
    if (!call || !call.status) return null;

  return (
    <>
      {/* INCOMING */}
      <IncomingCallWindow
        show={call.status === "INCOMING" && call.incoming?.from}  // extra strict: conn hona chahiye
        from={call.customerNumber}
        customerName={call.customerName}
        isTransfer={call.isTransfer}
        transferFrom={call.transferFrom}
        onAccept={() => onAction("ACCEPT")}
        onReject={() => onAction("REJECT")}
      />

      {/* ACTIVE CALL */}
      {call.callSid && (
        <ActiveCallDummy
          isMuted={call.isMuted}
          isRecording={call.isRecording}
          isOnHold={call.isOnHold}
          isSupervisedMode={call.isSupervisedMode}
          duration={call.duration}
          call={call}
          customerName={call.customerName}
          customerNumber={call.customerNumber}
          privileges={user?.agentPrivilege}
          onMute={() => onAction("MUTE")}
          onHold={() => onAction("HOLD")}
          onHangup={() => onAction("HANGUP")}
          onNotes={() => onAction("NOTES")}
          onAdd={() => onAction("TRANSFER")}
          onMakeLead={() => onAction("LEAD")}
          
        />
      )}

      {/* NOTES */}
      {/* <NotesSidebar
        isOpen={call.isNotesOpen}
        onClose={() => onAction("NOTES")}
        conversationLog={call.conversationLog}
      /> */}

      {/* TRANSFER */}
        
      <TransferModal
        show={call.transferOpen}
        type={call.transferType}
        agentList={call.agentList || []}
        agent={call.transferAgent}
        contacts={call.contacts}
        setAgent={(a) => onAction("SET_TRANSFER_AGENT", a)}
        onTransfer={(payload) => onAction("EXECUTE_TRANSFER", payload)}
        onCancel={() => onAction("CLOSE_TRANSFER")}
      />

      {/* LEAD */}
      <LeadSaleModal
        isOpen={call.isLeadModalOpen}
        onClose={() => onAction("LEAD")}
        customerName={call.customerName}
        customerNumber={call.customerNumber}
        contactInfo={call.contactInfo}
        fetchContactInfo={() => onAction("FETCH_CONTACT")}
      />

      {/* BLOCK */}
      <BlockNumberModal
        modal={call.blockModal}
        onClose={() => onAction("CLOSE_BLOCK")}
        onUnblock={(num) => onAction("UNBLOCK", num)}
      />
      
    </>
  );
}
