# LoVerse OS — полный пакет для Claude Code

Срез Jira и main: **29 октября 2026**. В комплекте **36 заданий**, все **56 задач Jira**, **8 эпиков**, активный спринт и **9 будущих спринтов**. В будущих спринтах — 27 заданий; ещё 9 относятся к текущей базе, её завершению и QA. Все рабочие инструкции Claude написаны на английском.

Это подготовленный и версионированный комплект. На момент подготовки **Claude Code ещё не запущен**: в этой среде нет его CLI, веб-страница требует входа. Подготовка задания, публикация PR и ссылки в Jira сами по себе не означают, что Claude начал реализацию.

## Что открыть

- [MASTER_PROMPT.md](MASTER_PROMPT.md) — полное задание Claude, включая порядок работы и условия передачи тебе на тестирование.
- [INVENTORY.md](INVENTORY.md) — все реальные задачи и их состояние; ничего не потеряно и не закрыто на основании одного просмотра кода.
- [BASELINE_AUDIT.md](BASELINE_AUDIT.md) — что уже есть в коде, что отсутствует и какие записи устарели.
- [REQUIREMENT_RECONCILIATION.md](REQUIREMENT_RECONCILIATION.md) — сохранённые требования, включая 24 полосы EQ на каждый канал, и границы исторических desktop/AI-идей.
- [DELIVERY_CONTRACT.md](DELIVERY_CONTRACT.md) — где Claude должен складывать код, отчёты, инструкции и результаты для каждой задачи Jira.
- [QA_HANDOFF.md](QA_HANDOFF.md) — порядок твоего будущего ручного тестирования.
- [manifest.json](manifest.json) — полный машиночитаемый список работ, зависимостей и стартовых статусов.

## Очередь

| Группа | Jira |
| --- | --- |
| [00-foundation](sprints/00-foundation.md) | LAS-7, LAS-8, LAS-9, LAS-10, LAS-11, LAS-12, LAS-48, LAS-49, LAS-57 |
| [01](sprints/01.md) | LAS-19, LAS-20, LAS-42, LAS-21 |
| [02](sprints/02.md) | LAS-22, LAS-23, LAS-24, LAS-43, LAS-25 |
| [03](sprints/03.md) | LAS-26, LAS-27, LAS-44 |
| [04](sprints/04.md) | LAS-28, LAS-29, LAS-45 |
| [05](sprints/05.md) | LAS-30, LAS-31 |
| [06](sprints/06.md) | LAS-32, LAS-33 |
| [07](sprints/07.md) | LAS-34, LAS-35, LAS-46, LAS-47 |
| [08](sprints/08.md) | LAS-36, LAS-37 |
| [09](sprints/09.md) | LAS-38, LAS-39 |

Задачи LAS-50/51 закрыты с принятой историей и остаются регрессионной базой. LAS-7/8/9/10 уже частично или полностью представлены в коде: Claude сначала проверяет критерии и закрывает пробелы, а не пишет всё заново. LAS-11/12 — оставшиеся новые функции. LAS-55 сейчас завершённый Test Execution; TC-002 — LAS-57.

У дизайна и исследований есть реальные контрольные точки. Claude готовит материал для выбора и продолжает независимые готовые работы; он не должен придумывать твоё согласование, ручной Pass, прослушивание или готовую поддержку плагинов.

## Запуск в твоём существующем Claude Code

Открой репозиторий `genstek/MPS-Audio-Studio` в Claude Code и передай ему это короткое задание:

```text
Fetch origin and inspect branch docs/LAS-40-claude-code-handoff-2026-10-29 without overwriting any local work. Read docs/claude-code/2026-10-29/MASTER_PROMPT.md from that branch and execute the full assignment. Start with baseline verification and the next ready LAS work order. Preserve main, use an isolated integration worktree, and produce issue-linked code, tests and QA evidence. Continue all dependency-ready work across sprints; record genuine design/credential/hardware gates and keep Gennady's manual results Not Run.
```

Этот текст предназначен для уже работающего Claude Code. Если передача через облачный Claude станет доступна после входа, можно отправить то же задание и проверить, что появилась реальная сессия/подтверждение запуска. До такого подтверждения статус передачи — не запущено.
