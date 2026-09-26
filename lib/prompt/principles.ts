import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 설계원리.md(마크다운 표)를 파싱해 구조화한다.
 * "문서가 곧 규칙" — 프롬프트는 이 데이터를 소스로 생성한다(CLAUDE.md 코드 원칙).
 */

export interface Guideline {
  no: string; // 예: "1.2"
  text: string;
}

export interface Principle {
  no: number; // 1~6
  title: string; // ':' 앞 요약 (예: "서사 이해 단계의 원리")
  description: string; // ':' 뒤 상세
  guidelines: Guideline[];
}

let cache: Principle[] | null = null;

/** 설계원리.md를 읽어 원리/지침 목록으로 반환 (모듈 캐시) */
export function loadPrinciples(): Principle[] {
  if (cache) return cache;

  const filePath = join(process.cwd(), "설계원리.md");
  const raw = readFileSync(filePath, "utf-8");

  const principles: Principle[] = [];
  const byNo = new Map<number, Principle>();

  for (const line of raw.split(/\r?\n/)) {
    // | 설계원리1. | 서사 이해 단계의 원리: ... |
    const pMatch = line.match(/^\|\s*설계원리\s*(\d+)\.\s*\|\s*(.+?)\s*\|\s*$/);
    if (pMatch) {
      const no = Number(pMatch[1]);
      const body = pMatch[2];
      const [title, ...rest] = body.split(":");
      const principle: Principle = {
        no,
        title: (rest.length ? title : body).trim(),
        description: rest.join(":").trim(),
        guidelines: [],
      };
      principles.push(principle);
      byNo.set(no, principle);
      continue;
    }

    // | 설계지침1.2. | ... |
    const gMatch = line.match(
      /^\|\s*설계지침\s*(\d+)\.(\d+)\.\s*\|\s*(.+?)\s*\|\s*$/,
    );
    if (gMatch) {
      const pNo = Number(gMatch[1]);
      const parent = byNo.get(pNo);
      if (parent) {
        parent.guidelines.push({
          no: `${gMatch[1]}.${gMatch[2]}`,
          text: gMatch[3].trim(),
        });
      }
    }
  }

  if (principles.length === 0) {
    throw new Error("설계원리.md에서 설계원리를 찾지 못했습니다. 파일 형식을 확인하세요.");
  }

  cache = principles.sort((a, b) => a.no - b.no);
  return cache;
}

export const PRINCIPLE_COUNT = 6;
