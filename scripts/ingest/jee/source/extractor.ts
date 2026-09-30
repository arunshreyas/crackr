import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { RawQuestion } from '../types';

const SOURCE_URL =
  'https://github.com/HostServer001/jee_mains_pyqs_data_base/releases/download/v007/1762787474-DataBaseChapters-v007.pkl';

const DEFAULT_PICKLE_PATH = '/tmp/DataBaseChapters.pkl';

/**
 * Extracts raw question records from the source pickle cache.
 * Handles automatic download if missing and streams output as JSON.
 */
export async function loadSourceQuestions(
  picklePath: string = DEFAULT_PICKLE_PATH
): Promise<RawQuestion[]> {
  // Ensure pickle file exists
  if (!fs.existsSync(picklePath)) {
    console.log(`[Source] Pickle file not found at ${picklePath}. Downloading...`);
    await downloadSourcePickle(picklePath);
  }

  console.log(`[Source] Reading dataset from ${picklePath}...`);

  const pythonScript = `
import pickle
import json
import sys

class Chapter: pass
class Question: pass

class CustomUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if name == 'Chapter': return Chapter
        if name == 'Question': return Question
        return super().find_class(module, name)

with open('${picklePath}', 'rb') as f:
    data = CustomUnpickler(f).load()

questions = []
for chap in data.values():
    for q in chap.question_dict.values():
        q_dict = {
            'question_id': getattr(q, 'question_id', ''),
            'examGroup': getattr(q, 'examGroup', ''),
            'exam': getattr(q, 'exam', ''),
            'subject': getattr(q, 'subject', ''),
            'chapterGroup': getattr(q, 'chapterGroup', ''),
            'chapter': getattr(q, 'chapter', ''),
            'year': getattr(q, 'year', 0),
            'paperTitle': getattr(q, 'paperTitle', ''),
            'difficulty': getattr(q, 'difficulty', ''),
            'topic': getattr(q, 'topic', ''),
            'type': getattr(q, 'type', ''),
            'examDate': getattr(q, 'examDate', None),
            'answer': getattr(q, 'answer', None),
            'question': getattr(q, 'question', ''),
            'options': getattr(q, 'options', []),
            'correct_options': getattr(q, 'correct_options', []),
            'explanation': getattr(q, 'explanation', ''),
            'isOutOfSyllabus': getattr(q, 'isOutOfSyllabus', False),
            'isBonus': getattr(q, 'isBonus', False),
            'isImgQuestion': getattr(q, 'isImgQuestion', False),
            'isImgExplanation': getattr(q, 'isImgExplanation', False),
            'isImgOption': getattr(q, 'isImgOption', []),
        }
        questions.append(q_dict)

json.dump(questions, sys.stdout)
`;

  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['-c', pythonScript]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    py.on('close', (code: number | null) => {
      if (code !== 0) {
        return reject(new Error(`Failed to extract questions (exit code ${code}): ${stderr}`));
      }
      try {
        const questions: RawQuestion[] = JSON.parse(stdout);
        console.log(`[Source] Extracted ${questions.length} total source records.`);
        resolve(questions);
      } catch (err) {
        reject(new Error(`JSON parse error during extraction: ${(err as Error).message}`));
      }
    });
  });
}

function downloadSourcePickle(destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-L', SOURCE_URL, '-o', destPath]);
    curl.on('close', (code: number | null) => {
      if (code === 0 && fs.existsSync(destPath)) {
        resolve();
      } else {
        reject(new Error(`Failed to download source pickle from ${SOURCE_URL}`));
      }
    });
  });
}
