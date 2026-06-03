import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { http } from "../lib/api";

const TrackingContext = createContext(null);

export const TrackingProvider = ({ children }) => {
  const [trackedDriverId, setTrackedDriverId] = useState(null);
  const [trackingData, setTrackingData] = useState({ driver: null, route: null, lastUpdated: 0 });
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const timerRef = useRef(null);
  const stateRef = useRef({ isTracking, isSimulating, trackedDriverId });

  // Sync ref with state
  useEffect(() => {
    stateRef.current = { isTracking, isSimulating, trackedDriverId };
  }, [isTracking, isSimulating, trackedDriverId]);

  const poll = useCallback(async (driverId) => {
    if (!driverId) return;
    try {
      const ts = Date.now();
      // Ensure we get fresh data from server
      const [dRes, rRes] = await Promise.all([
        http.get(`/drivers?cache_bust=${ts}`),
        http.get(`/routing/${driverId}?cache_bust=${ts}`)
      ]);
      
      const driver = dRes.data.find(d => d.id === driverId);
      console.log(`[TrackingEngine] Polled ${driverId}. Pos: ${driver?.location?.lat}, ${driver?.location?.lng}`);
      
      setTrackingData({ 
        driver, 
        route: rRes.data, 
        lastUpdated: ts 
      });
    } catch (e) {
      console.error("[TrackingEngine] Poll error", e);
    }
  }, []);

  // Central Loop
  useEffect(() => {
    if (!isTracking || !trackedDriverId) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setTrackingData({ driver: null, route: null, lastUpdated: 0 });
      return;
    }

    const runCycle = async () => {
      const { isTracking: active, isSimulating: sim, trackedDriverId: id } = stateRef.current;
      
      if (!active || !id) return;

      if (sim) {
        try {
          await http.post("/routing/simulate-step-all", { step_m: 150 });
        } catch (e) { console.error("[TrackingEngine] Step error", e); }
      }

      await poll(id);

      // Schedule next tick
      if (stateRef.current.isTracking) {
        timerRef.current = setTimeout(runCycle, 2000);
      }
    };

    console.log("[TrackingEngine] Loop started for", trackedDriverId);
    runCycle();

    return () => {
      console.log("[TrackingEngine] Loop cleanup");
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTracking, trackedDriverId, poll]);

  const startTracking = (driverId) => {
    setTrackedDriverId(driverId);
    setIsTracking(true);
    setIsSimulating(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setIsSimulating(false);
    setTrackedDriverId(null);
  };

  return (
    <TrackingContext.Provider value={{ 
      isTracking, 
      trackedDriverId, 
      trackingData, 
      isSimulating,
      startTracking, 
      stopTracking,
      toggleSimulation: () => setIsSimulating(p => !p),
      refresh: () => poll(trackedDriverId)
    }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => useContext(TrackingContext);
