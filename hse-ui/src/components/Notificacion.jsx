import { Toaster } from "react-hot-toast";

const Notificacion = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Define estilos por defecto para todos los toasts
        duration: 4000,
        success: {
          style: {
            background: "#ecfdf5", // un verde suave
            color: "#065f46",
            border: "1px solid #10b981",
          },
        },
        error: {
          style: {
            background: "#fef2f2", // un rojo suave
            color: "#991b1b",
            border: "1px solid #ef4444",
          },
        },
      }}
    />
  );
};

export default Notificacion;
