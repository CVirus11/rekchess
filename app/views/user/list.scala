package views.html
package user

import lila.api.Context
import lila.app.templating.Environment._
import lila.app.ui.ScalatagsTemplate._
import lila.rating.PerfType
import lila.user.User

import controllers.routes

object list {

  def apply(
    tourneyWinners: List[lila.tournament.Winner],
    online: List[User],
    leaderboards: lila.user.Perfs.Leaderboards,
    nbDay: List[User.LightCount],
    nbAllTime: List[User.LightCount]
  )(implicit ctx: Context) = views.html.base.layout(
    title = trans.players.txt(),
    moreCss = responsiveCssTag("user.list"),
    responsive = true,
    fullScreen = true,
    openGraph = lila.app.ui.OpenGraph(
      title = "Chess players and leaderboards",
      url = s"$netBaseUrl${routes.User.list.url}",
      description = "Best chess players in bullet, blitz, rapid, classical, Chess960 and more chess variants"
    ).some
  ) {
      main(cls := "page-menu page-large")(
        bits.communityMenu("leaderboard"),
        div(cls := "community page-menu__content box box-pad")(
          st.section(cls := "community__online")(
            h2(trans.onlinePlayers.frag()),
            ol(cls := "user_top")(online map { u =>
              li(
                userLink(u),
                showBestPerf(u)
              )
            })
          ),
          div(cls := "community__leaders")(
            h2(trans.leaderboard.frag()),
            div(cls := "leaderboards")(
              userTopPerf(leaderboards.ultraBullet, PerfType.UltraBullet),
              userTopPerf(leaderboards.bullet, PerfType.Bullet),
              userTopPerf(leaderboards.blitz, PerfType.Blitz),
              userTopPerf(leaderboards.rapid, PerfType.Rapid),
              userTopPerf(leaderboards.classical, PerfType.Classical),

              userTopActive(nbAllTime, trans.activePlayers(), icon = 'U'.some),
              tournamentWinners(tourneyWinners),

              userTopPerf(leaderboards.crazyhouse, PerfType.Crazyhouse),
              userTopPerf(leaderboards.chess960, PerfType.Chess960),
              userTopPerf(leaderboards.antichess, PerfType.Antichess),
              userTopPerf(leaderboards.atomic, PerfType.Atomic),
              userTopPerf(leaderboards.threeCheck, PerfType.ThreeCheck),
              userTopPerf(leaderboards.kingOfTheHill, PerfType.KingOfTheHill),
              userTopPerf(leaderboards.horde, PerfType.Horde),
              userTopPerf(leaderboards.racingKings, PerfType.RacingKings)
            )
          )
        )
      )
    }

  private def tournamentWinners(winners: List[lila.tournament.Winner])(implicit ctx: Context) =
    st.section(cls := "user_top")(
      h2(cls := "text", dataIcon := "g")(
        a(href := routes.Tournament.leaderboard)(trans.tournament.frag())
      ),
      ol(winners take 10 map { w =>
        li(
          userIdLink(w.userId.some),
          a(title := w.tourName, href := routes.Tournament.show(w.tourId))(
            scheduledTournamentNameShortHtml(w.tourName)
          )
        )
      })
    )

  private def userTopPerf(users: List[User.LightPerf], perfType: PerfType) =
    st.section(cls := "user_top")(
      h2(cls := "text", dataIcon := perfType.iconChar)(
        a(href := routes.User.topNb(200, perfType.key))(perfType.name)
      ),
      ol(users map { l =>
        li(
          lightUserLink(l.user),
          l.rating
        )
      })
    )

  private def userTopActive(users: List[User.LightCount], hTitle: Any, icon: Option[Char] = None)(implicit ctx: Context) =
    st.section(cls := "user_top")(
      h2(cls := "text", dataIcon := icon.map(_.toString))(hTitle.toString),
      ol(users map { u =>
        li(
          lightUserLink(u.user),
          span(title := trans.gamesPlayed.txt())(s"#${u.count.localize}")
        )
      })
    )
}
