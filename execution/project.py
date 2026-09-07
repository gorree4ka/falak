# -*- coding: utf-8 -*-
u"""Единственное место, где живут пути, адреса и ключи проекта.

Скрипты не хардкодят ни корень, ни ключ файла Figma: корень выводится из
собственного расположения, остальное читается из `project.json` в корне
проекта. Заполнить его — первый шаг после копирования кита.

    from project import ROOT, ROOT_STR, PROTOTYPE, FILE_KEY, PAGES, SECTIONS, need
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROOT_STR = ROOT.as_posix().rstrip('/') + '/'
APP = ROOT / 'app'

_cfg = ROOT / 'project.json'
CFG = json.loads(_cfg.read_text(encoding='utf-8')) if _cfg.exists() else {}

PROTOTYPE = CFG.get('prototype_url') or ''
STORYBOOK = CFG.get('storybook_url') or ''
COLLECTOR = CFG.get('collector_url') or ''
_figma = CFG.get('figma') or {}
FILE_KEY = _figma.get('file_key') or ''
PAGES = _figma.get('pages') or {}
SECTIONS = _figma.get('sections') or {}


def need(dotted, hint=''):
    u"""Достать значение из project.json или внятно упасть, а не молча соврать."""
    cur = CFG
    for k in dotted.split('.'):
        cur = (cur or {}).get(k) if isinstance(cur, dict) else None
    if not cur:
        raise SystemExit(u'project.json: не заполнено «%s». %s' % (dotted, hint))
    return cur
