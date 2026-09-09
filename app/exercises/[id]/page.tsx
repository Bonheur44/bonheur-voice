import { notFound } from "next/navigation";
import { EXERCISES, getExercise } from "@/data/exercises";
import { ExerciseView } from "./ExerciseView";

export function generateStaticParams() {
  return EXERCISES.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const ex = getExercise(id);
  return { title: ex ? ex.name : "Exercice" };
}

export default async function ExercisePage({ params }: PageProps<"/exercises/[id]">) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();
  return <ExerciseView exercise={exercise} />;
}
