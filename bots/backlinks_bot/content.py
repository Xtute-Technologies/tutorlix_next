from __future__ import annotations

from html import escape

from .config import BacklinkItem, TargetSite


def build_backlink_html(
    backlink: BacklinkItem,
    target: TargetSite,
    *,
    link_rel: str,
) -> str:
    keywords = ", ".join(backlink.keywords)
    keyword_html = ""
    if keywords:
        keyword_html = f"<p><strong>Related topics:</strong> {escape(keywords)}</p>"

    rel_attribute = f' rel="{escape(link_rel, quote=True)}"' if link_rel else ""
    return "\n".join(
        [
            f"<p>{escape(backlink.description)}</p>",
            (
                f'<p>Recommended resource: <a href="{escape(backlink.url, quote=True)}"'
                f"{rel_attribute}>{escape(backlink.anchor_text)}</a>.</p>"
            ),
            keyword_html,
            (
                "<p><em>This resource was added through an authorized Tutorlix "
                f"backlink workflow for {escape(target.id)}.</em></p>"
            ),
        ]
    )


def build_post_title(backlink: BacklinkItem, target: TargetSite) -> str:
    del target
    return backlink.title

