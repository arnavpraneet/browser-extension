import { getBrowser, getCurrentTabInfo } from '../../@/lib/utils.ts';
import BookmarkTreeNode = browser.bookmarks.BookmarkTreeNode;
import { getConfig, isConfigured } from '../../@/lib/config.ts';
import { deleteLinkFetch, postLinkFetch, updateLinkFetch } from '../../@/lib/actions/links.ts';
import {
  bookmarkMetadata,
  deleteBookmarkMetadata, getBookmarkMetadataByBookmarkId, getBookmarkMetadataByUrl, getBookmarksMetadata,
  saveBookmarkMetadata,
} from '../../@/lib/cache.ts';
import ContextType = browser.menus.ContextType;
import OnClickData = browser.menus.OnClickData;
import { getCsrfTokenFetch, getSessionFetch, performLoginOrLogoutFetch } from '../../@/lib/auth/auth.ts';
import OnInputEnteredDisposition = browser.omnibox.OnInputEnteredDisposition;

const browser = getBrowser();

// This is the main functions that will be called when a bookmark is created, update or deleted
// Won't work with axios xhr or something not supported by the browser

browser.bookmarks.onCreated.addListener(async (_id: string, bookmark: BookmarkTreeNode) => {
  try {
    const { syncBookmarks, baseUrl, username, password, usingSSO } = await getConfig();
    if (!syncBookmarks || !bookmark.url) {
      return;
    }
    const session = await getSessionFetch(baseUrl);

    // Check if the bookmark already exists in the server by checking the url so, it doesn't create duplicates
    // I know, could use the method search from the api, but I want to avoid as much api specific calls as possible
    // in case isn't supported, so I prefer to do it this way, if performance is an issue I will think of change to that.

    const existingLink = await getBookmarkMetadataByUrl(bookmark.url);
    if (existingLink) {
      return;
    }

    if (!session && !usingSSO) {
      const csrfToken = await getCsrfTokenFetch(baseUrl);

      await performLoginOrLogoutFetch(`${baseUrl}/api/v1/auth/callback/credentials`, {
        csrfToken: csrfToken,
        callbackUrl: `${baseUrl}/api/v1/auth/callback`,
        json: true,
        redirect: false,
        username: username,
        password: password,
      })
    } else if (!session && usingSSO) {
      return;
    }

    const newLink = await postLinkFetch(baseUrl, {
      url: bookmark.url,
      collection: {
        name: "Unorganized",
      },
      tags: [],
      name: bookmark.title,
      description: bookmark.title,
    });

    const newLinkJson = await newLink.json()
    const newLinkUrl: bookmarkMetadata = newLinkJson.response;
    newLinkUrl.bookmarkId = bookmark.id;

    await saveBookmarkMetadata(newLinkUrl)

  } catch (error) {
    console.error(error);
  }
});

browser.bookmarks.onChanged.addListener(async (id: string, changeInfo: {url?: string, title?: string}) => {
  try {
    const { syncBookmarks, baseUrl, username, password, usingSSO } = await getConfig();
    if (!syncBookmarks || !changeInfo.url) {
      return;
    }

    const link = await getBookmarkMetadataByBookmarkId(id);

    if (!link) {
      return;
    }

    const session = await getSessionFetch(baseUrl);

    if (!session && !usingSSO) {
      const csrfToken = await getCsrfTokenFetch(baseUrl);

      await performLoginOrLogoutFetch(`${baseUrl}/api/v1/auth/callback/credentials`, {
        csrfToken: csrfToken,
        callbackUrl: `${baseUrl}/api/v1/auth/callback`,
        json: true,
        redirect: false,
        username: username,
        password: password,
      })
    } else if (!session && usingSSO) {
      return;
    }

    const updatedLink = await updateLinkFetch(baseUrl, link.id, {
      url: changeInfo.url,
      collection: {
        name: "Unorganized",
      },
      tags: [],
      name: changeInfo.title,
      description: changeInfo.title,
    });

    const updatedLinkJson = await updatedLink.json()
    const newLinkUrl: bookmarkMetadata = updatedLinkJson.response;
    newLinkUrl.bookmarkId = id;

    await saveBookmarkMetadata(newLinkUrl)

  } catch (error) {
    console.error(error);
  }
});

browser.bookmarks.onRemoved.addListener(async (id: string, removeInfo: {node: {url?: string}}) => {
  try {
    const { syncBookmarks, baseUrl, username, password, usingSSO } = await getConfig();
    if (!syncBookmarks || !removeInfo.node.url) {
      return;
    }
    const link = await getBookmarkMetadataByBookmarkId(id);

    if (!link) {
      return;
    }

    const session = await getSessionFetch(baseUrl);

    if (!session && !usingSSO) {
      const csrfToken = await getCsrfTokenFetch(baseUrl);

      await performLoginOrLogoutFetch(`${baseUrl}/api/v1/auth/callback/credentials`, {
        csrfToken: csrfToken,
        callbackUrl: `${baseUrl}/api/v1/auth/callback`,
        json: true,
        redirect: false,
        username: username,
        password: password,
      })
    } else if (!session && usingSSO) {
      return;
    }

    await Promise.all([
      deleteBookmarkMetadata(link.bookmarkId),
      deleteLinkFetch(baseUrl, link.id)
    ])

  } catch (error) {
    console.error(error);
  }
}); 

browser.menus.onClicked.addListener(async (info: browser.menus.OnClickData, tab: browser.tabs.Tab | undefined) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await genericOnClick(info, tab);
});

// A generic onclick callback function.xe
async function genericOnClick(info: browser.menus.OnClickData, tab: browser.tabs.Tab | undefined) {
  const { syncBookmarks, baseUrl, username, password, usingSSO } = await getConfig();
  const configured = await isConfigured();
  if (!tab?.url || !tab?.title || !configured) {
    return;
  }
  switch (info.menuItemId) {
    case 'radio':
      // Radio item function
      console.log('Radio item clicked. Status:', info.checked);
      break;
    case 'checkbox':
      // Checkbox item function
      console.log('Checkbox item clicked. Status:', info.checked);
      break;
    default:
      // Handle cases where sync is enabled or not
      if (syncBookmarks) {
        browser.bookmarks.create({
          parentId: '1',
          title: tab.title,
          url: tab.url,
        });
      } else {
        try {
          const session = await getSessionFetch(baseUrl);

          if (!session && !usingSSO) {
            const csrfToken = await getCsrfTokenFetch(baseUrl);

            await performLoginOrLogoutFetch(`${baseUrl}/api/v1/auth/callback/credentials`, {
              csrfToken: csrfToken,
              callbackUrl: `${baseUrl}/api/v1/auth/callback`,
              json: true,
              redirect: false,
              username: username,
              password: password,
            })
          } else if (!session && usingSSO) {
            return;
          }

          const newLink = await postLinkFetch(baseUrl, {
            url: tab.url,
            collection: {
              name: "Unorganized",
            },
            tags: [],
            name: tab.title,
            description: tab.title,
          });

          const newLinkJson = await newLink.json()
          const newLinkUrl: bookmarkMetadata = newLinkJson.response;
          newLinkUrl.bookmarkId = tab.id?.toString();

          await saveBookmarkMetadata(newLinkUrl)
        } catch (error) {
          console.error(error);
        }

      }
  }
}

browser.runtime.onInstalled.addListener(function () {
  // Create one test item for each context type.
  const contexts: browser.contextMenus.ContextType[] = [
    'page',
    'selection',
    'link',
    'editable',
    'image',
    'video',
    'audio'
  ];
  for (const context of contexts) {
    const title: string = "Add link to Linkwarden";
    browser.contextMenus.create({
      title: "Test parent item",
      contexts: [context], // or any other valid context type
      id: "parent",
    });
  }
});

// Omnibox implementation

browser.omnibox.onInputStarted.addListener(async () => {
  const configured = await isConfigured();
  const description = configured ? 'Search links in linkwarden' : 'Please configure the extension first';

  browser.omnibox.setDefaultSuggestion({
    description: description,
  });
});

browser.omnibox.onInputChanged.addListener(async (text: string, suggest: (arg0: { content: string; description: string; }[]) => void) => {
  const configured = await isConfigured();

  if (!configured) {
    return;
  }

  const currentBookmarks = await getBookmarksMetadata();

  const searchedBookmarks = currentBookmarks.filter(bookmark => {
    return bookmark.name?.includes(text) || bookmark.url.includes(text);
  });

  const bookmarkSuggestions = searchedBookmarks.map(bookmark => {
     return {
       content: bookmark.url,
       description: bookmark.name || bookmark.url
     }
  });
  suggest(bookmarkSuggestions)

});

// This part was taken https://github.com/sissbruecker/linkding-extension/blob/master/src/background.js Thanks to @sissbruecker

browser.omnibox.onInputEntered.addListener(async (content: string, disposition: OnInputEnteredDisposition) => {
  if (!await isConfigured() || !content) {
    return;
  }

  const isUrl = /^http(s)?:\/\//.test(content);
  const url = isUrl
    ? content
    : `lk`;

  // Edge doesn't allow updating the New Tab Page (tested with version 117).
  // Trying to do so will throw: "Error: Cannot update NTP tab."
  // As a workaround, open a new tab instead.
  if (disposition === "currentTab") {
    const tabInfo = await getCurrentTabInfo();
    if (tabInfo.url === "edge://newtab/") {
      disposition = "newForegroundTab";
    }
  }

  switch (disposition) {
    case "currentTab":
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await browser.tabs.update({ url });
      break;
    case "newForegroundTab":
      await browser.tabs.create({ url });
      break;
    case "newBackgroundTab":
      await browser.tabs.create({ url, active: false });
      break;
  }
});


