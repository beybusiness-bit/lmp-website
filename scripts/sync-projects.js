#!/usr/bin/env node
/**
 * sync-projects.js
 *
 * p/index.html 템플릿을 기반으로, 저장소 내 모든 프로젝트 플레이어 파일을 동기화한다.
 * Vercel 빌드 시(buildCommand) 자동 실행되므로 p/index.html만 수정하면
 * 모든 프로젝트에 자동 반영된다.
 *
 * 프로젝트 파일 판별 기준:
 *   {디렉토리}/index.html 에 `const PROJECT_ID = '{디렉토리명}'` 패턴이 존재하면 대상으로 처리.
 */

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const TEMPLATE = path.join(ROOT, 'p', 'index.html');

// 템플릿에서 PROJECT_ID를 읽는 코드 (이 부분이 프로젝트별 ID로 교체됨)
const TEMPLATE_ID_LINE = "new URLSearchParams(location.search).get('id') || ''";

if (!fs.existsSync(TEMPLATE)) {
  console.error('❌ p/index.html 템플릿을 찾을 수 없습니다.');
  process.exit(1);
}

const templateContent = fs.readFileSync(TEMPLATE, 'utf8');

// 동기화 대상 디렉토리 자동 탐색
const entries = fs.readdirSync(ROOT, { withFileTypes: true });
const projectDirs = entries
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(name => {
    const htmlPath = path.join(ROOT, name, 'index.html');
    if (!fs.existsSync(htmlPath)) return false;
    const content = fs.readFileSync(htmlPath, 'utf8');
    // 해당 디렉토리명이 PROJECT_ID로 하드코딩된 파일만 대상
    return content.includes(`const PROJECT_ID = '${name}'`);
  });

if (projectDirs.length === 0) {
  console.log('동기화할 프로젝트 파일이 없습니다.');
  process.exit(0);
}

let synced = 0;
projectDirs.forEach(projectId => {
  const outPath = path.join(ROOT, projectId, 'index.html');
  const synced_content = templateContent.replace(TEMPLATE_ID_LINE, `'${projectId}'`);
  fs.writeFileSync(outPath, synced_content, 'utf8');
  console.log(`✅ 동기화 완료: ${projectId}/index.html`);
  synced++;
});

console.log(`\n총 ${synced}개 프로젝트 파일 동기화 완료.`);
