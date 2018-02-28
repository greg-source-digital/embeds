/*
  This function will receive a timeline segment object and should return either a raw HTML element or
  a JQuery element. Add the pause-on-click class to hyperlinks and other elements to automatically pause the player when clicked.
  To see what fields are available on the timeline segment visit http://sourcecore.azurewebsites.net/api/docs#GetTimelineSegment
*/

let dataTypesDictionary = {};
let dataObjectsForAllSegments = {}; // all data objects (in the timeline segments, not "global") that have segment bounds (i.e. could potentially be displayed as an overlay)

const ShowMode = {
    CURRENT_OBJECT_LIST: 'currentObjectList',
    VIEW_ALL: 'viewAll',
    DETAILS: 'details',
};

let showMode = ShowMode.CURRENT_OBJECT_LIST;

function init() {
    for (let dt of dataTypes) {
        dataTypesDictionary[dt.id] = dt;
    }
}

function onViewAllClick(event) {
    event.stopPropagation();
    switchSourceXViewMode(ShowMode.VIEW_ALL);
    window.sourcePlayer.pause();
}

function switchSourceXViewMode(mode) {
    if (mode == ShowMode.CURRENT_OBJECT_LIST) {
        $(`.source-x-view-all`).css('display', 'none');
        $('.source-x-description-container').css('display', 'none');
        $(`.source-x-display`).css('display', 'block');
    } else if (mode == ShowMode.VIEW_ALL) {
        $(`.source-x-display`).css('display', 'none');
        $('.source-x-description-container').css('display', 'none');
        $(`.source-x-view-all`).css('display', 'block');
    } else if (mode == ShowMode.DETAILS) {
        $(`.source-x-display`).css('display', 'none');
        $(`.source-x-view-all`).css('display', 'none');
        $('.source-x-description-container').css('display', 'block');
    }

    showMode = mode;
}

function onViewAllTabClick(event, dataTypeName) {
    event.stopPropagation();

    $(`a[class="source-x-tab source-x-active-tab"]`).attr('class', 'source-x-tab');
    $(`a[class="source-x-tab"][data-tab="${dataTypeName}"]`).attr('class', 'source-x-tab source-x-active-tab');
    $('.source-x-view-all-item-container.source-x-active-content').attr('class', 'source-x-view-all-item-container');
    $(`#${dataTypeName}`).attr('class', 'source-x-view-all-item-container source-x-active-content');
}

function onCloseViewAll(event) {
    event.stopPropagation();
    switchSourceXViewMode(ShowMode.CURRENT_OBJECT_LIST);
}

function onCloseDescription(event) {
    event.stopPropagation();
    switchSourceXViewMode(ShowMode.CURRENT_OBJECT_LIST);
    window.sourcePlayer.play();
}

function getSourceXItemHtml(dataObject) {
    if (dataObject.dataTypeName == 'castMember') {
        let html = `<b>${dataObject.name}</b>`;

        if (!(dataObject.data['characterName'] == undefined)) {
            html += `<br/>${dataObject.data['characterName']}`;
        }

        return html;
    } else if (dataObject.dataTypeName == 'product') {
        let html = `<b>${dataObject.name}</b>`;

        if (!(dataObject.data['brandName'] == undefined)) {
            html += `<br/>${dataObject.data['brandName']}`;
        }

        return html;
    } else {
        return `<b>${dataObject.name}</b>`;
    }
}

function buildSourceXDescriptionHtml(sourceXDescriptionItemContainerNode, dataObjectId) {
    let description = '';
    let subHeading = ''; // typically character name for cast members, brand for products, etc.
    let dataObject = dataObjectsForAllSegments[dataObjectId];

    let sourceXDescriptionImageContainer = $('<div />').attr('class', 'source-x-description-image-container');
    let sourceXDescriptionContent = $('<div />').attr('class', 'source-x-description-content');
    let header = $('<h1 />')
        .attr('class', 'source-x-description-title')
        .html(dataObject.name);

    sourceXDescriptionImageContainer.append(
        $('<img />')
            .attr('src', dataObject.mainImageUrl)
            .attr('class', 'source-x-description-image')
    );

    sourceXDescriptionItemContainerNode.append(sourceXDescriptionImageContainer);
    sourceXDescriptionItemContainerNode.append(sourceXDescriptionContent);
    sourceXDescriptionContent.append(header);

    // TODO: add the other data types...
    switch (dataObject.dataTypeName) {
        case 'castMember':
            subHeading = dataObject.data['characterName'];
            description = dataObject.data['bio'];
            break;
        case 'product':
            subHeading = dataObject.data['brandName'];
        // do NOT break here
        case 'location':
            description = dataObject.data['description'];
            break;
        default:
            description = '(No description)';
    }

    sourceXDescriptionContent.append($('<div />').html(subHeading));

    let sourceXDescriptionText = $('<div />')
        .attr('class', 'source-x-description-text')
        .html(description);

    sourceXDescriptionContent.append(sourceXDescriptionText);

    if (dataObject.dataTypeName == 'product') {
        let descriptionLinks = $('<div />').attr('class', 'source-x-decription-links');
        let moreInfoLink = $('<a target="_blank"/>').attr('href', dataObject.data['displayLink']);
        let moreInfoButton = $('<button />').attr('class', 'source-x-button');
        let shoppingLink = $('<a target="_blank"/>').attr('href', dataObject.data['shoppingLink']);
        let shoppingButton = $('<button />').attr('class', 'source-x-button');

        moreInfoButton.html('More Info').attr('onclick', 'onMoreInfoClick(event || window.event)');
        shoppingButton.html('Buy Now').attr('onclick', 'onBuyNowClick(event || window.event)');

        if (dataObject.data['displayLink']) {
            moreInfoLink.append(moreInfoButton);
            descriptionLinks.append(moreInfoLink);
        }

        if (dataObject.data['shoppingLink']) {
            shoppingLink.append(shoppingButton);
            descriptionLinks.append(shoppingLink);
        }

        sourceXDescriptionContent.append(descriptionLinks);
    }
}

function onMoreInfoClick(event) {
    event.stopPropagation();
}

function onBuyNowClick(event) {
    event.stopPropagation();
}

function onSourceXItemClick(event, dataObjectId) {
    event.stopPropagation();

    let sourceXDescriptionItemContainerNode = $('.source-x-description-item-container').first();

    sourceXDescriptionItemContainerNode.empty();
    buildSourceXDescriptionHtml(sourceXDescriptionItemContainerNode, dataObjectId); // should only be one element with the class "source-x-description-content"
    switchSourceXViewMode(ShowMode.DETAILS);
    window.sourcePlayer.pause();
}

function onEmbedLoaded(segments) {
    let sourceXDisplay = $(`<div />`).attr('class', 'source-x-display');
    let sourceXDisplayControls = $('<div />').attr('class', 'source-x-display-controls');
    let sourceXDisplayItemContainer = $('<div />').attr('class', 'source-x-display-item-container');
    let sourceXDescriptionContainer = $('<div />').attr('class', 'source-x-description-container');
    let sourceXViewAll = $('<div />').attr('class', 'source-x-view-all');
    let sourceXViewAllTabs = $('<nav />').attr('class', 'source-x-view-all-tabs');
    let sourceXViewAllClose = $('<span />').attr('class', 'fa fa-window-close-o source-x-close');
    let sourceXDescriptionClose = $('<span />').attr('class', 'fa fa-window-close-o source-x-close');
    let sourceXViewAllGrid = $('<div />').attr('class', 'source-x-view-all-grid');
    let sourceXDescriptionItemContainer = $('<div />').attr('class', 'source-x-description-item-container');

    init();

    // default view
    sourceXDisplay.append(sourceXDisplayControls);
    sourceXDisplay.append(sourceXDisplayItemContainer);

    sourceXDisplayControls.append(
        $('<a />')
            .attr('onclick', `onViewAllClick(event || window.event)`)
            .html('View All')
    );

    // view all
    sourceXViewAll.append(sourceXViewAllTabs);
    sourceXViewAll.append(sourceXViewAllClose);
    sourceXViewAll.append(sourceXViewAllGrid);
    sourceXViewAllClose.attr('onclick', `onCloseViewAll(event || window.event)`);

    // description
    sourceXDescriptionContainer.append(sourceXDescriptionClose);
    sourceXDescriptionContainer.append(sourceXDescriptionItemContainer);
    sourceXDescriptionClose.attr('onclick', 'onCloseDescription(event || window.event)');

    let dataTypesInSourceX = {};

    for (let i = 0; i < segments.length; i++) {
        let seg = segments[i];

        if (dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
            let dataObjectId = seg.dataObject.id;
            let dataTypeName = seg.dataTypeName;

            if (!(dataObjectId in dataObjectsForAllSegments)) {
                dataObjectsForAllSegments[dataObjectId] = segments[i].dataObject;

                let thumbnailImageURL = seg.dataObject.mainImageUrl;

                if (thumbnailImageURL) {
                    let sourceXItemDivId = `source-x-display-item-${dataTypeName}-${dataObjectId}`;
                    let sourceXItemDivClassName = `source-x-display-item`;
                    let sourceXItem = $(`<div />`).attr({ id: sourceXItemDivId, class: sourceXItemDivClassName, 'data-object-id': seg.dataObject.id });
                    let sourceXItemImageContainer = $('<div />').attr('class', 'source-x-item-image-div');
                    let sourceXItemText = $('<div />');

                    sourceXItemImageContainer.attr('onclick', `onSourceXItemClick(event || window.event, "${seg.dataObject.id}")`);
                    sourceXItemText.attr('onclick', `onSourceXItemClick(event || window.event, "${seg.dataObject.id}")`);
                    sourceXItemText.attr('class', 'source-x-item-text').html(getSourceXItemHtml(seg.dataObject));

                    sourceXItemImageContainer.append($('<img />').attr('src', thumbnailImageURL));
                    sourceXItemImageContainer.append(sourceXItemText);
                    sourceXItem.append(sourceXItemImageContainer);
                    sourceXItem.append(sourceXItemText);
                    sourceXDisplayItemContainer.append(sourceXItem);

                    if (!(dataTypeName in dataTypesInSourceX)) {
                        dataTypesInSourceX[dataTypeName] = { displayName: seg.dataObject.dataTypeDisplayName, dataObjectList: [] };
                    }

                    dataTypesInSourceX[dataTypeName].dataObjectList.push(seg.dataObject);
                }
            }
        }
    }

    let first = true;

    for (let dataTypeName in dataTypesInSourceX) {
        if (dataTypesInSourceX.hasOwnProperty(dataTypeName)) {
            let tab = $('<a />')
                .attr('class', first ? 'source-x-tab source-x-active-tab' : 'source-x-tab')
                .attr('data-tab', dataTypeName)
                .attr('onclick', `onViewAllTabClick(event || window.event, "${dataTypeName}")`)
                .html(dataTypesInSourceX[dataTypeName].displayName);

            sourceXViewAllTabs.append(tab);

            let viewAllItemContainer = $('<div />').attr({ id: dataTypeName, class: first ? 'source-x-view-all-item-container source-x-active-content' : 'source-x-view-all-item-container' });
            sourceXViewAllGrid.append(viewAllItemContainer);

            for (let i = 0; i < dataTypesInSourceX[dataTypeName].dataObjectList.length; i++) {
                let dataObject = dataTypesInSourceX[dataTypeName].dataObjectList[i];
                let sourceXItemDivId = `source-x-view-all-item-${dataTypeName}-${dataObject.id}`;
                let sourceXItemDivClassName = `source-x-display-item`;
                let sourceXItem = $(`<div />`).attr({ id: sourceXItemDivId, class: sourceXItemDivClassName });
                let sourceXItemImageContainer = $('<div />').attr('class', 'source-x-item-image-div');
                let imgNode = $('<img />').attr('src', dataObject.mainImageUrl);

                sourceXItemImageContainer.attr('onclick', `onSourceXItemClick(event || window.event, "${dataObject.id}")`);

                viewAllItemContainer.append(sourceXItem);
                sourceXItem.append(sourceXItemImageContainer);
                sourceXItemImageContainer.append(imgNode);

                let sourceXItemText = $('<div />')
                    .attr('class', 'source-x-item-text')
                    .attr('onclick', `onSourceXItemClick(event || window.event, "${dataObject.id}")`)
                    .html(getSourceXItemHtml(dataObject));

                sourceXItem.append(sourceXItemText);
            }

            first = false;
        }
    }

    sourceXDisplay.css('display', 'none');
    sourceXViewAll.css('display', 'none');
    sourceXDescriptionContainer.css('display', 'none');

    putElementOnVideo(sourceXDisplay);
    putElementOnVideo(sourceXDescriptionContainer);
    putElementOnVideo(sourceXViewAll);
}

function putElementOnVideo(element) {
    $('#videoContainer').append(element);
}

function onSegmentStarting(seg) {
    if (dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
        $(`div[class="source-x-display-item"][data-object-id="${seg.dataObject.id}"]`).attr('class', 'source-x-display-item load');
    }
}

function onSegmentEnding(seg) {
    if (dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
        $(`div[class="source-x-display-item load"][data-object-id="${seg.dataObject.id}"]`).attr('class', 'source-x-display-item');
    }
}

function onVideoClicked() {
    if (showMode != ShowMode.DETAILS) window.sourcePlayer.play();
}

function onMouseEnterVideo() {
    switchSourceXViewMode(showMode);
}

function onMouseLeaveVideo() {
    //$(`.source-x-display`).fadeOut('fast');
    //$(`.source-x-view-all`).fadeOut('fast');
}
