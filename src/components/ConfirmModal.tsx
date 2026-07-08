// @ts-nocheck

export const ConfirmModal = ({
    title,
    text,
    onYes,
    onNo
  }: {
    title: string;
    text: string;
    onYes: () => void;
    onNo: () => void;
  }) => {
    return (
      <div className="modal d-block" style={{ background: "rgba(0,0,0,0.25)" }}>
        <div className="modal-dialog">
          <div className="modal-content shadow">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
            </div>
  
            <div className="modal-body">
              <p>{text}</p>
            </div>
  
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onNo}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onYes}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  