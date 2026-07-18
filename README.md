# Super Star Trek — web mission

Браузерная адаптация старой Super Star Trek: исходная C-версия находится в `sstsrc/`; её исторический источник — [almy.us/sst.html](https://almy.us/sst.html). Зависимости и сборка не нужны.

```sh
cd /Volumes/project/startrek
python3 -m http.server 4173
```

Затем откройте `http://127.0.0.1:4173`.


Варианты интерфейса:

- `01 Console` — терминал с командной строкой в стиле оригинала. Попробуйте `help`, `help move`, `scan`, `chart`, `move n 2`, `move 1 1`, `move 2 1 5 5`, `warp e`, `warp 5 2`, `phasers`, `photons`, `shields`, `dock`, `orbit`, `transport`, `mine`, `crystals`, `planets`, `rest`, `status`.
- `02 Tactical Deck` — новая игровая «палуба»: тактическая сетка, интерактивная карта галактики, кнопки боя и импульсная навигация.

Состояние миссии автоматически хранится в `localStorage` браузера, поэтому его можно продолжить с заставки. Переключатель `♫` включает короткий оригинальный синтезаторный эмбиент-цикл, не использующий мелодию или запись из Star Trek.
