//@ts-nocheck
import { useNetworkStatus } from "../hooks/useNetworkStatus";



export default function NetworkStatusBar() {
  const { online, effectiveType, downlink, rtt } = useNetworkStatus();

  if (online && effectiveType === "4g") {
    return null; // hide when everything is good (optional – you can keep it always visible)
  }

  let message = "No Internet Connection";
  let bgColor = "bg-red-600";
  let textColor = "text-white";

  if (online) {
    if (effectiveType === "slow-2g" || effectiveType === "2g") {
      message = "Very Slow Connection";
      bgColor = "bg-orange-600";
    } else if (effectiveType === "3g") {
      message = "Slow Connection (3G)";
      bgColor = "bg-amber-600";
    } else if (effectiveType === "4g") {
      message = "Good Connection";
      bgColor = "bg-green-600";
    } else {
      message = "Checking connection...";
      bgColor = "bg-gray-700";
    }

    if (downlink && downlink < 1) {
      message += ` • Slow (${downlink.toFixed(1)} Mbps)`;
    }
  }
   if(message === "No Internet Connection"){

     return (
       <div
         className={` ${bgColor} ${textColor} text-center text-sm py-2 font-medium shadow-md transition-all duration-300`}
       >
         {message}
         {online && rtt && rtt > 150 && ` • High latency (${rtt} ms)`}
       </div>
     );
   }
}