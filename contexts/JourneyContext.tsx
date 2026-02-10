import { Journey, JourneyStatus } from '@/types/Journey';
import * as storage from '@/utils/storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface JourneyContextType {
  activeJourney: Journey | null;
  isTracking: boolean;
  startJourney: (journey: Journey) => Promise<void>;
  endJourney: () => Promise<void>;
  updateStatus: (status: JourneyStatus) => Promise<void>;
}

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Load active journey from storage on mount
  useEffect(() => {
    loadActiveJourney();
  }, []);

  const loadActiveJourney = async () => {
    try {
      const storedJourney = await storage.getActiveJourney();
      if (storedJourney) {
        const journey: Journey = JSON.parse(storedJourney);
        setActiveJourney(journey);
        setIsTracking(
          journey.status === JourneyStatus.Boarding || 
          journey.status === JourneyStatus.InProgress
        );
      }
    } catch (error) {
      console.error('Error loading active journey:', error);
    }
  };

  const startJourney = async (journey: Journey) => {
    try {
      await storage.setActiveJourney(JSON.stringify(journey));
      setActiveJourney(journey);
      setIsTracking(true);
    } catch (error) {
      console.error('Error starting journey:', error);
      throw error;
    }
  };

  const endJourney = async () => {
    try {
      await storage.removeActiveJourney();
      setActiveJourney(null);
      setIsTracking(false);
    } catch (error) {
      console.error('Error ending journey:', error);
      throw error;
    }
  };

  const updateStatus = async (status: JourneyStatus) => {
    if (!activeJourney) return;

    try {
      const updatedJourney = { ...activeJourney, status };
      await storage.setActiveJourney(JSON.stringify(updatedJourney));
      setActiveJourney(updatedJourney);
      
      // Update tracking state based on status
      setIsTracking(
        status === JourneyStatus.Boarding || 
        status === JourneyStatus.InProgress
      );

      // Auto-clear journey if completed or cancelled
      if (status === JourneyStatus.Completed || status === JourneyStatus.Cancelled) {
        setTimeout(() => endJourney(), 2000); // Clear after 2 seconds
      }
    } catch (error) {
      console.error('Error updating journey status:', error);
      throw error;
    }
  };

  return (
    <JourneyContext.Provider
      value={{
        activeJourney,
        isTracking,
        startJourney,
        endJourney,
        updateStatus,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (context === undefined) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
}
