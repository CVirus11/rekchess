import { h } from 'snabbdom'
import { VNode } from 'snabbdom/vnode'
import { view as renderConfig } from './explorerConfig';
import { bind, dataIcon } from '../util';
import AnalyseCtrl from '../ctrl';
import { isOpening, isTablebase } from './interfaces';

function resultBar(move): VNode {
  const sum = move.white + move.draws + move.black;
  function section(key) {
    const percent = move[key] * 100 / sum;
    return percent === 0 ? null : h('span.' + key, {
      attrs: { style: 'width: ' + (Math.round(move[key] * 1000 / sum) / 10) + '%' },
    }, percent > 12 ? Math.round(percent) + (percent > 20 ? '%' : '') : '');
  }
  return h('div.bar', ['white', 'draws', 'black'].map(section));
}

let lastShow: VNode;

function moveTableAttributes(ctrl: AnalyseCtrl, fen: Fen) {
  return {
    attrs: { 'data-fen': fen },
    hook: {
      insert: vnode => {
        const el = vnode.elm as HTMLElement;
        el.addEventListener('mouseover', e => {
          ctrl.explorer.setHovering($(el).attr('data-fen'), $(e.target).parents('tr').attr('data-uci'));
        });
        el.addEventListener('mouseout', _ => {
          ctrl.explorer.setHovering($(el).attr('data-fen'), null);
        });
        el.addEventListener('mousedown', e => {
          const uci = $(e.target).parents('tr').attr('data-uci');
          if (uci) ctrl.explorerMove(uci);
        });
      },
      postpatch: (_, vnode) => {
        setTimeout(() => {
          const el = vnode.elm as HTMLElement;
          ctrl.explorer.setHovering($(el).attr('data-fen'), $(el).find('tr:hover').attr('data-uci'));
        }, 100);
      }
    }
  };
}

function showMoveTable(ctrl: AnalyseCtrl, moves, fen: Fen): VNode | null {
  if (!moves.length) return null;
  return h('table.moves', [
    h('thead', [
      h('tr', [
        h('th', ctrl.trans.noarg('move')),
        h('th', ctrl.trans.noarg('games')),
        h('th', ctrl.trans.noarg('whiteDrawBlack'))
      ])
    ]),
    h('tbody', moveTableAttributes(ctrl, fen), moves.map(function(move) {
      return h('tr', {
        key: move.uci,
        attrs: {
          'data-uci': move.uci,
          title: ctrl.trans('averageRatingX', move.averageRating)
        }
      }, [
        h('td', move.san[0] === 'P' ? move.san.slice(1) : move.san),
        h('td', window.lichess.numberFormat(move.white + move.draws + move.black)),
        h('td', resultBar(move))
      ]);
    }))
  ]);
}

function showResult(winner: Color): VNode {
  if (winner === 'white') return h('result.white', '1-0');
  if (winner === 'black') return h('result.black', '0-1');
  return h('result.draws', '½-½');
}

function showGameTable(ctrl: AnalyseCtrl, title: string, games): VNode | null {
  if (!ctrl.explorer.withGames || !games.length) return null;
  return h('table.games', [
    h('thead', [
      h('tr', [
        h('th', { attrs: { colspan: 4 } }, title)
      ])
    ]),
    h('tbody', {
      hook: bind('click', e => {
        const $tr = $(e.target).parents('tr');
        if (!$tr.length) return;
        const orientation = ctrl.chessground.state.orientation;
        const fenParam = ctrl.node.ply > 0 ? ('?fen=' + ctrl.node.fen) : '';
        if (ctrl.explorer.config.data.db.selected() === 'lichess')
          window.open('/' + $tr.data('id') + '/' + orientation + fenParam, '_blank');
        else window.open('/import/master/' + $tr.data('id') + '/' + orientation + fenParam, '_blank');
      })
    }, games.map(function(game) {
      return h('tr', {
        key: game.id,
        attrs: { 'data-id': game.id }
      }, [
        h('td', [game.white, game.black].map(function(p) {
          return h('span', p.rating);
        })),
        h('td', [game.white, game.black].map(function(p) {
          return h('span', p.name);
        })),
        h('td', showResult(game.winner)),
        h('td', game.year)
      ]);
    }))
  ]);
}

function showTablebase(ctrl: AnalyseCtrl, title: string, moves, fen: Fen): VNode[] {
  if (!moves.length) return [];
  const stm = fen.split(/\s/)[1];
  return [
    h('div.title', title),
    h('table.tablebase', [
      h('tbody', moveTableAttributes(ctrl, fen), moves.map(function(move) {
        return h('tr', {
          key: move.uci,
          attrs: { 'data-uci': move.uci }
        }, [
          h('td', move.san),
          h('td', [showDtz(ctrl, stm, move), showDtm(ctrl, stm, move)])
        ]);
      }))
    ])
  ];
}

function winner(stm, move): Color | undefined {
  if ((stm[0] == 'w' && move.wdl < 0) || (stm[0] == 'b' && move.wdl > 0))
    return 'white';
  if ((stm[0] == 'b' && move.wdl < 0) || (stm[0] == 'w' && move.wdl > 0))
    return 'black';
}

function showDtm(ctrl: AnalyseCtrl, stm, move) {
  if (move.dtm) return h('result.' + winner(stm, move), {
    attrs: {
      title: ctrl.trans.plural('mateInXHalfMoves', Math.abs(move.dtm)) + ' (Depth To Mate)'
    }
  }, 'DTM ' + Math.abs(move.dtm));
}

function showDtz(ctrl: AnalyseCtrl, stm, move): VNode | null {
  const trans = ctrl.trans.noarg;
  if (move.checkmate) return h('result.' + winner(stm, move), trans('checkmate'));
  else if (move.stalemate) return h('result.draws', trans('stalemate'));
  else if (move.variant_win) return h('result.' + winner(stm, move), trans('variantLoss'));
  else if (move.variant_loss) return h('result.' + winner(stm, move), trans('variantWin'));
  else if (move.insufficient_material) return h('result.draws', trans('insufficientMaterial'));
  else if (move.dtz === null) return null;
  else if (move.dtz === 0) return h('result.draws', trans('draw'));
  else if (move.zeroing) return move.san.indexOf('x') !== -1 ?
  h('result.' + winner(stm, move), trans('capture')) :
  h('result.' + winner(stm, move), trans('pawnMove'));
  return h('result.' + winner(stm, move), {
    attrs: {
      title: ctrl.trans.plural('nextCaptureOrPawnMoveInXHalfMoves', Math.abs(move.dtz))
    }
  }, 'DTZ ' + Math.abs(move.dtz));
}

function closeButton(ctrl: AnalyseCtrl): VNode {
  return h('button.button.text', {
    attrs: dataIcon('L'),
    hook: bind('click', ctrl.toggleExplorer, ctrl.redraw)
  }, ctrl.trans.noarg('close'));
}

function showEmpty(ctrl: AnalyseCtrl): VNode {
  return h('div.data.empty', [
    h('div.title', showTitle(ctrl, ctrl.data.game.variant)),
    h('div.message', [
      h('h3', ctrl.trans.noarg('noGameFound')),
      ctrl.explorer.config.fullHouse() ?
        null :
        h('p.explanation', ctrl.trans.noarg('maybeIncludeMoreGamesFromThePreferencesMenu')),
      closeButton(ctrl)
    ])
  ]);
}

function showGameEnd(ctrl: AnalyseCtrl, title: string): VNode {
  return h('div.data.empty', [
    h('div.title', ctrl.trans.noarg('gameOver')),
    h('div.message', [
      h('i', { attrs: dataIcon('') }),
      h('h3', title),
      closeButton(ctrl)
    ])
  ]);
}

function show(ctrl: AnalyseCtrl) {
  const trans = ctrl.trans.noarg,
  data = ctrl.explorer.current();
  if (isOpening(data)) {
    const moveTable = showMoveTable(ctrl, data.moves, data.fen),
    recentTable = showGameTable(ctrl, trans('recentGames'), data['recentGames'] || []),
    topTable = showGameTable(ctrl, trans('topGames'), data['topGames'] || []);
    if (moveTable || recentTable || topTable) lastShow = h('div.data', [moveTable, topTable, recentTable]);
    else lastShow = showEmpty(ctrl);
  } else if (isTablebase(data)) {
    const moves = data.moves;
    if (moves.length) lastShow = h('div.data', [
      [trans('winning'), m => m.wdl === -2],
      [trans('unknown'), m => m.wdl === null],
      [trans('winPreventedBy50MoveRule'), m => m.wdl === -1],
      [trans('drawn'), m => m.wdl === 0],
      [trans('lossSavedBy50MoveRule'), m => m.wdl === 1],
      [trans('losing'), m => m.wdl === 2],
    ].map(a => showTablebase(ctrl, a[0] as string, moves.filter(a[1]), data.fen))
      .reduce(function(a, b) { return a.concat(b); }, []))
    else if (data.checkmate) lastShow = showGameEnd(ctrl, trans('checkmate'))
      else if (data.stalemate) lastShow = showGameEnd(ctrl, trans('stalemate'))
        else if (data.variant_win || data.variant_loss) lastShow = showGameEnd(ctrl, trans('variantEnding'));
      else lastShow = showEmpty(ctrl);
  }
  return lastShow;
}

function showTitle(ctrl: AnalyseCtrl, variant: Variant) {
  if (variant.key === 'standard' || variant.key === 'fromPosition') return ctrl.trans.noarg('openingExplorer');
  return ctrl.trans('xOpeningExplorer', variant.name);
}

function showConfig(ctrl: AnalyseCtrl): VNode {
  return h('div.config', [
    h('div.title', showTitle(ctrl, ctrl.data.game.variant))
  ].concat(renderConfig(ctrl.explorer.config)));
}

function showFailing(ctrl) {
  return h('div.data.empty', [
    h('div.title', showTitle(ctrl, ctrl.data.game.variant)),
    h('div.failing.message', [
      h('h3', "Oops, sorry!"),
      h('p.explanation', "The explorer is temporarily out of service. Try again soon!"),
      closeButton(ctrl)
    ])
  ]);
}

let lastFen: Fen = '';

export default function(ctrl: AnalyseCtrl): VNode | undefined {
  const explorer = ctrl.explorer;
  if (!explorer.enabled()) return;
  const data = explorer.current();
  const config = explorer.config;
  const configOpened = config.data.open();
  const loading = !configOpened && (explorer.loading() || (!data && !explorer.failing()));
  const content = configOpened ? showConfig(ctrl) : (explorer.failing() ? showFailing(ctrl) : show(ctrl));
  return h('div.explorer_box', {
    class: {
      loading,
      config: configOpened,
      reduced: !configOpened && (explorer.failing() || explorer.movesAway() > 2)
    },
    hook: {
      insert: vnode => (vnode.elm as HTMLElement).scrollTop = 0,
      postpatch(_, vnode) {
        if (!data || lastFen === data.fen) return;
        (vnode.elm as HTMLElement).scrollTop = 0;
        lastFen = data.fen;
      }
    }
  }, [
    h('div.overlay'),
    content, (!content || explorer.failing()) ? null : h('span.toconf', {
      attrs: dataIcon(configOpened ? 'L' : '%'),
      hook: bind('click', config.toggleOpen, ctrl.redraw)
    })
  ]);
};
