'use client';

import { ExerciseResult, ExerciseType, ExerciseReview, ExerciseSuggestion } from '@/types';

export async function getExerciseResults(): Promise<ExerciseResult[]> {
  const res = await fetch('/api/exercises');
  if (!res.ok) return [];
  return res.json();
}

export async function getExerciseResultsByType(type: ExerciseType): Promise<ExerciseResult[]> {
  const res = await fetch(`/api/exercises?type=${type}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveExerciseResult(
  result: Omit<ExerciseResult, 'id' | 'completed_at'>
): Promise<ExerciseResult> {
  const res = await fetch('/api/exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erreur lors de la sauvegarde de l\'exercice');
  }
  return res.json();
}

export async function getExerciseReview(
  result: Omit<ExerciseResult, 'id' | 'completed_at'>
): Promise<ExerciseReview> {
  const res = await fetch('/api/exercises/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erreur lors de l\'analyse de l\'exercice');
  }
  return res.json();
}

export async function getExerciseSuggestions(): Promise<ExerciseSuggestion[]> {
  const res = await fetch('/api/exercises/suggest');
  if (!res.ok) return [];
  return res.json();
}
