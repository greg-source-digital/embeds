/*
  This function will receive a timeline segment object and should return either a raw HTML element or
  a JQuery element. Add the pause-on-click class to hyperlinks and other elements to automatically pause the player when clicked.
  To see what fields are available on the timeline segment visit http://sourcecore.azurewebsites.net/api/docs#GetTimelineSegment
*/

let dataTypesDictionary = {};
let dataObjectsDictionary = {}; // all "global" data objects for the production
let dataObjectsForAllSegments = {}; // all data objects (in the timeline segments, not "global") that have segment bounds (i.e. could potentially be displayed as an overlay)
let modals = {};
let sneakPeekModals = {};
let hiddenDots = {}; // the dots which are temporarily hidden due to showing a modal or group of modals
let activeDots = {}; // the dots which are _potentially_ visible at the current moment in time (i.e. if the user hovers their mouse over the video)
let defaultDotFilter = 'brightness(100%) blur(4px) saturate(100%)';
let litUpDotFilter = 'brightness(175%) blur(4px) saturate(325%)';
let defaultIconFilter = 'brightness(100%) blur(0px) saturate(100%)';
let litUpIconFilter = 'brightness(175%) blur(0px) saturate(325%)';
let isMouseOverVideo = false;

// TODO: this dot style should be moved to the CSS script tab; it's only here for now so I don't have to switch tabs when editing...
let dotStyle = `
    filter: brightness(100%) blur(4px) saturate(100%);
    position: absolute;
    display: block;
    height: 30px;
    width: 30px;
    line-height: 30px;
    -moz-border-radius: 15px;
    border-radius: 15px;
    opacity: 0.7;`;

let iconStyle = `
    filter: brightness(100%) blur(0px) saturate(100%);
    position: absolute;
    display: block;
    height: 30px;
    width: 30px;
    line-height: 30px;
    -moz-border-radius: 15px;
    border-radius: 15px;
    opacity: 0.7;`;

let thumbnailStyle = `
    position: absolute;
    display: block;
    opacity: 0.7;`;

const ExperienceDisplayMode = {
    HOTSPOTS: 'hotspots',
    X_RAY: 'x-ray',
};

const ShowMode = {
    CURRENT_OBJECT_LIST: 'currentObjectList',
    VIEW_ALL: 'viewAll',
    DETAILS: 'details',
};

let displayMode = ExperienceDisplayMode.X_RAY;
let showMode = ShowMode.CURRENT_OBJECT_LIST;
let dotDebugging = false;

function init() {
    for (let dt of dataTypes) {
        dataTypesDictionary[dt.id] = dt;
    }

    for (let dataObject of dataObjects) {
        dataObjectsDictionary[dataObject.id] = dataObject;
    }
}

function onViewAllClick(event) {
    event.stopPropagation();
    switchXRayViewMode(ShowMode.VIEW_ALL);
    window.sourcePlayer.pause();
}

function switchXRayViewMode(mode) {
    if (mode == ShowMode.CURRENT_OBJECT_LIST) {
        $(`.x-ray-view-all`).css('display', 'none');
        $('.x-ray-description-container').css('display', 'none');
        $(`.x-ray-display`).css('display', 'block');
    } else if (mode == ShowMode.VIEW_ALL) {
        $(`.x-ray-display`).css('display', 'none');
        $('.x-ray-description-container').css('display', 'none');
        $(`.x-ray-view-all`).css('display', 'block');
    } else if (mode == ShowMode.DETAILS) {
        $(`.x-ray-display`).css('display', 'none');
        $(`.x-ray-view-all`).css('display', 'none');
        $('.x-ray-description-container').css('display', 'block');
    }

    showMode = mode;
}

function onViewAllTabClick(event, dataTypeName) {
    event.stopPropagation();

    $(`a[class="x-ray-tab x-ray-active-tab"]`).attr('class', 'x-ray-tab');
    $(`a[class="x-ray-tab"][data-tab="${dataTypeName}"]`).attr('class', 'x-ray-tab x-ray-active-tab');
    $('.x-ray-view-all-item-container.x-ray-active-content').attr('class', 'x-ray-view-all-item-container');
    $(`#${dataTypeName}`).attr('class', 'x-ray-view-all-item-container x-ray-active-content');
}

function onCloseViewAll(event) {
    event.stopPropagation();
    switchXRayViewMode(ShowMode.CURRENT_OBJECT_LIST);
}

function onCloseDescription(event) {
    event.stopPropagation();
    switchXRayViewMode(ShowMode.CURRENT_OBJECT_LIST);
}

function getXRayItemHtml(dataObject) {
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

function buildXRayDescriptionHtml(xRayDescriptionItemContainerNode, dataObjectId) {
    let description = '';
    let subHeading = ''; // typically character name for cast members, brand for products, etc.
    let dataObject = dataObjectsForAllSegments[dataObjectId];

    let xRayDescriptionImageContainer = $('<div />').attr('class', 'x-ray-description-image-container');
    let xRayDescriptionContent = $('<div />').attr('class', 'x-ray-description-content');
    let header = $('<h1 />')
        .attr('class', 'x-ray-description-title')
        .html(dataObject.name);

    xRayDescriptionImageContainer.append(
        $('<img />')
            .attr('src', dataObject.mainImageUrl)
            .attr('class', 'x-ray-description-image')
    );

    xRayDescriptionItemContainerNode.append(xRayDescriptionImageContainer);
    xRayDescriptionItemContainerNode.append(xRayDescriptionContent);
    xRayDescriptionContent.append(header);

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

    xRayDescriptionContent.append($('<div />').html(subHeading));

    let xRayDescriptionText = $('<div />')
        .attr('class', 'x-ray-description-text')
        .html(description);

    xRayDescriptionContent.append(xRayDescriptionText);

    if (dataObject.dataTypeName == 'product') {
        let descriptionLinks = $('<div />').attr('class', 'x-ray-decription-links');
        let moreInfoLink = $('<a target="_blank"/>').attr('href', dataObject.data['displayLink']);
        let moreInfoButton = $('<button />').attr('class', 'x-ray-button');
        let shoppingLink = $('<a target="_blank"/>').attr('href', dataObject.data['shoppingLink']);
        let shoppingButton = $('<button />').attr('class', 'x-ray-button');

        moreInfoLink.append(moreInfoButton);
        shoppingLink.append(shoppingButton);
        descriptionLinks.append(moreInfoLink);
        descriptionLinks.append(shoppingLink);
        xRayDescriptionContent.append(descriptionLinks);

        moreInfoButton.html('More Info').attr('onclick', 'onMoreInfoClick(event || window.event)');
        shoppingButton.html('Buy Now').attr('onclick', 'onBuyNowClick(event || window.event)');
    }
}

function onMoreInfoClick(event) {
    event.stopPropagation();
}

function onBuyNowClick(event) {
    event.stopPropagation();
}

function onXRayItemClick(event, dataObjectId) {
    event.stopPropagation();

    let xRayDescriptionItemContainerNode = $('.x-ray-description-item-container').first();

    xRayDescriptionItemContainerNode.empty();
    buildXRayDescriptionHtml(xRayDescriptionItemContainerNode, dataObjectId); // should only be one element with the class "x-ray-description-content"
    switchXRayViewMode(ShowMode.DETAILS);
    window.sourcePlayer.pause();
}

function onEmbedLoaded(segments) {
    if (displayMode == ExperienceDisplayMode.X_RAY) {
        let xRayDisplay = $(`<div />`).attr('class', 'x-ray-display');
        let xRayDisplayControls = $('<div />').attr('class', 'x-ray-display-controls');
        let xRayDisplayItemContainer = $('<div />').attr('class', 'x-ray-display-item-container');
        let xRayDescriptionContainer = $('<div />').attr('class', 'x-ray-description-container');
        let xRayViewAll = $('<div />').attr('class', 'x-ray-view-all');
        let xRayViewAllTabs = $('<nav />').attr('class', 'x-ray-view-all-tabs');
        let xRayViewAllClose = $('<span />').attr('class', 'fa fa-window-close-o x-ray-close');
        let xRayDescriptionClose = $('<span />').attr('class', 'fa fa-window-close-o x-ray-close');
        let xRayViewAllGrid = $('<div />').attr('class', 'x-ray-view-all-grid');
        let xRayDescriptionItemContainer = $('<div />').attr('class', 'x-ray-description-item-container');

        // default view
        xRayDisplay.append(xRayDisplayControls);
        xRayDisplay.append(xRayDisplayItemContainer);

        xRayDisplayControls.append(
            $('<a />')
                .attr('onclick', `onViewAllClick(event || window.event)`)
                .html('View All')
        );

        // view all
        xRayViewAll.append(xRayViewAllTabs);
        xRayViewAll.append(xRayViewAllClose);
        xRayViewAll.append(xRayViewAllGrid);
        xRayViewAllClose.attr('onclick', `onCloseViewAll(event || window.event)`);

        // description
        xRayDescriptionContainer.append(xRayDescriptionClose);
        xRayDescriptionContainer.append(xRayDescriptionItemContainer);
        xRayDescriptionClose.attr('onclick', 'onCloseDescription(event || window.event)');

        let dataTypesInXRay = {};

        for (let i = 0; i < segments.length; i++) {
            let seg = segments[i];

            if (seg.startBounds && dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
                let dataObjectId = seg.dataObject.id;
                let dataTypeName = seg.dataTypeName;

                if (!(dataObjectId in dataObjectsForAllSegments)) {
                    dataObjectsForAllSegments[dataObjectId] = segments[i].dataObject;

                    let thumbnailImageURL = seg.dataObject.mainImageUrl;

                    if (thumbnailImageURL) {
                        let xRayItemDivId = `x-ray-display-item-${dataTypeName}-${dataObjectId}`;
                        let xRayItemDivClassName = `x-ray-display-item`;
                        let xRayItem = $(`<div />`).attr({ id: xRayItemDivId, class: xRayItemDivClassName, 'data-object-id': seg.dataObject.id });
                        let xRayItemImageContainer = $('<div />').attr('class', 'x-ray-item-image-div');
                        let xRayItemText = $('<span />');

                        xRayItemImageContainer.attr('onclick', `onXRayItemClick(event || window.event, "${seg.dataObject.id}")`);
                        xRayItemText.attr('class', 'x-ray-item-text').html(getXRayItemHtml(seg.dataObject));

                        xRayItemImageContainer.append($('<img />').attr('src', thumbnailImageURL));
                        xRayItemImageContainer.append(xRayItemText);
                        xRayItem.append(xRayItemImageContainer);
                        xRayItem.append(xRayItemText);
                        xRayDisplayItemContainer.append(xRayItem);

                        if (!(dataTypeName in dataTypesInXRay)) {
                            dataTypesInXRay[dataTypeName] = { displayName: seg.dataObject.dataTypeDisplayName, dataObjectList: [] };
                        }

                        dataTypesInXRay[dataTypeName].dataObjectList.push(seg.dataObject);
                    }
                }
            }
        }

        let first = true;

        for (let dataTypeName in dataTypesInXRay) {
            if (dataTypesInXRay.hasOwnProperty(dataTypeName)) {
                let tab = $('<a />')
                    .attr('class', first ? 'x-ray-tab x-ray-active-tab' : 'x-ray-tab')
                    .attr('data-tab', dataTypeName)
                    .attr('onclick', `onViewAllTabClick(event || window.event, "${dataTypeName}")`)
                    .html(dataTypesInXRay[dataTypeName].displayName);

                xRayViewAllTabs.append(tab);

                let viewAllItemContainer = $('<div />').attr({ id: dataTypeName, class: first ? 'x-ray-view-all-item-container x-ray-active-content' : 'x-ray-view-all-item-container' });
                xRayViewAllGrid.append(viewAllItemContainer);

                for (let i = 0; i < dataTypesInXRay[dataTypeName].dataObjectList.length; i++) {
                    let dataObject = dataTypesInXRay[dataTypeName].dataObjectList[i];
                    let xRayItemDivId = `x-ray-view-all-item-${dataTypeName}-${dataObject.id}`;
                    let xRayItemDivClassName = `x-ray-display-item`;
                    let xRayItem = $(`<div />`).attr({ id: xRayItemDivId, class: xRayItemDivClassName });
                    let xRayItemImageContainer = $('<div />').attr('class', 'x-ray-item-image-div');
                    let imgNode = $('<img />').attr('src', dataObject.mainImageUrl);

                    xRayItemImageContainer.attr('onclick', `onXRayItemClick(event || window.event, "${dataObject.id}")`);

                    viewAllItemContainer.append(xRayItem);
                    xRayItem.append(xRayItemImageContainer);
                    xRayItemImageContainer.append(imgNode);

                    let xRayItemText = $('<span />')
                        .attr('class', 'x-ray-item-text')
                        .html(getXRayItemHtml(dataObject));

                    xRayItem.append(xRayItemText);
                }

                first = false;
            }
        }

        xRayDisplay.css('display', 'none');
        xRayViewAll.css('display', 'none');
        xRayDescriptionContainer.css('display', 'none');

        putElementOnVideo(xRayDisplay);
        putElementOnVideo(xRayDescriptionContainer);
        putElementOnVideo(xRayViewAll);
    }
}

function putElementOnVideo(element) {
    $('#videoContainer').append(element);
}

function getFieldsForModal(dataObject) {
    let dataType = dataTypesDictionary[dataObject.dataTypeId];
    let fieldsToDisplay = {};

    // go through all fields of the data type checking for the "show on modal" option
    for (let i = 0; i < dataType.fields.length; i++) {
        let field = dataType.fields[i];

        if (field.options.includes('showOnModalExtension')) {
            fieldsToDisplay[field.id] = field;
        }
    }

    return fieldsToDisplay;
}

function getFieldByName(name, dataObject) {
    let dataType = dataTypesDictionary[dataObject.dataTypeId];
    let dataField = null;

    for (let i = 0; i < dataType.fields.length; i++) {
        let field = dataType.fields[i];

        if (field.name == name) {
            dataField = field;
            break;
        }
    }

    return dataField;
}

function onSegmentStarting(seg) {
    if (seg.startBounds && dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
        if (displayMode == ExperienceDisplayMode.HOTSPOTS || dotDebugging == true) {
            let dot = $(`<div />`)
                .attr('id', seg.id)
                .attr('onclick', `onDotClick(event || window.event, '${seg.id}')`)
                .attr('onmouseenter', `onDotEnter('${seg.id}')`)
                .attr('onmouseleave', `onDotLeave('${seg.id}')`);

            let dataType = dataTypesDictionary[seg.dataObject.dataTypeId];
            let colorStyleToUse = 'background-color';
            let extendedDotStyles = '';
            let modalExtensionIconType = dataType.modalExtensionIconType;

            // don't be defined for timeline-only data objects
            if (dataObjectsDictionary[seg.dataObject.id] !== undefined) {
                if (dataObjectsDictionary[seg.dataObject.id].modalExtensionIconType) {
                    modalExtensionIconType = dataObjectsDictionary[seg.dataObject.id].modalExtensionIconType;
                }
            }

            dot.modalExtensionIconType = modalExtensionIconType;

            if (modalExtensionIconType == 'dot') {
                extendedDotStyles = dotStyle;
            } else if (modalExtensionIconType == 'dataTypeIcon') {
                colorStyleToUse = 'color';
                extendedDotStyles = iconStyle;

                dot.append($(`<i class='fa ${dataType.iconClass} fa-2x' />`));
            } else if (modalExtensionIconType == 'dataObjectThumbnail') {
                extendedDotStyles = thumbnailStyle;

                let img = $('<img />')
                    .attr('src', seg.dataObject.mainImageUrl)
                    .css({
                        width: '60px',
                        display: 'block',
                        margin: '0 auto',
                        'box-sizing': 'border-box',
                        'max-width': '100%',
                        'max-height': '100%',
                    });

                dot.append(img);
            }

            if (modalExtensionIconType != 'dataObjectThumbnail') {
                if (dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor) {
                    extendedDotStyles += `${colorStyleToUse}: ${dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor};`;
                } else {
                    extendedDotStyles += `${colorStyleToUse}: blue;`;
                }
            }

            dot.attr('style', extendedDotStyles).css({
                left: `${seg.startBounds.ui.x}px`,
                top: `${seg.startBounds.ui.y}px`,
                // 'z-index': 99999, // TODO: not sure if this is really needed, test when done with everything
            });

            if (!isMouseOverVideo) {
                dot.css('display', 'none');
            }

            activeDots[seg.id] = dot;

            putElementOnVideo(dot);
        }

        if (displayMode == ExperienceDisplayMode.X_RAY) {
            $(`div[class="x-ray-display-item"][data-object-id="${seg.dataObject.id}"]`).attr('class', 'x-ray-display-item load');
            //console.warn('segment start ', test);
        }
    }
}

function onSegmentEnding(seg) {
    //console.log('onSegmentEnding()');

    if (dataTypesDictionary[seg.dataObject.dataTypeId].enableModalExtension) {
        if (displayMode == ExperienceDisplayMode.HOTSPOTS || dotDebugging == true) {
            $(`#${seg.id}`).fadeOut('slow', function() {
                $(`#${seg.id}`).remove();

                if (seg.id in hiddenDots) {
                    delete hiddenDots[seg.id];
                }

                if (seg.id in activeDots) {
                    delete activeDots[seg.id];
                }

                $(`#${seg.id}-modal`).remove();
                delete modals[`${seg.id}-modal`];

                let sneakPeekModalId = `${seg.id}-sneak-peek-modal`;

                if (!(sneakPeekModalId in sneakPeekModals)) {
                    removeSneakPeekModal(sneakPeekModalId);
                }
            });
        }

        if (displayMode == ExperienceDisplayMode.X_RAY) {
            $(`div[class="x-ray-display-item load"][data-object-id="${seg.dataObject.id}"]`).attr('class', 'x-ray-display-item');
        }
    }
}

function onDotEnter(segmentId) {
    //console.log('onDotEnter()');

    if (activeDots[segmentId] === undefined) {
        console.warn(`Warning: activeDots[segmentId] is undefined. segmentId = ${segmentId}`, activeDots);
    }

    if (activeDots[segmentId].modalExtensionIconType == 'dot') {
        $(`#${segmentId}`).css({
            filter: litUpDotFilter,
            transform: 'scale(1.1)', // make the dot a little bigger when the mouse is over it
            transition: 'filter .19s ease, transform .19s ease',
        });
    } else if (activeDots[segmentId].modalExtensionIconType == 'dataTypeIcon') {
        $(`#${segmentId}`).css({
            filter: litUpIconFilter,
            transform: 'scale(1.1)',
            transition: 'filter .19s ease, transform .19s ease',
        });
    }

    setTimeout(function() {
        // since there is a delay, it's possible that the segment is now gone
        if (activeSegmentObjects[segmentId]) {
            let currentSneakPeekModalId = showSneakPeekModal(activeSegmentObjects[segmentId]);

            // remove previously open sneak-peek modal(s)
            for (let modalId in sneakPeekModals) {
                if (sneakPeekModals.hasOwnProperty(modalId) && modalId != currentSneakPeekModalId) {
                    closeSneakPeek(modalId);
                }
            }
        }
    }, 190);
}

function onDotLeave(segmentId) {
    //console.log('onDotLeave()');

    if (activeDots[segmentId] === undefined) {
        console.warn(`Warning: activeDots[segmentId] is undefined. segmentId = ${segmentId}`, activeDots);
        return;
    }

    if (activeDots[segmentId].modalExtensionIconType == 'dot') {
        $(`#${segmentId}`).css({
            filter: defaultDotFilter,
            transform: 'scale(1.0)', // restore original size
        });
    } else if (activeDots[segmentId].modalExtensionIconType == 'dataTypeIcon') {
        $(`#${segmentId}`).css({
            filter: defaultIconFilter,
            transform: 'scale(1.0)', // restore original size
        });
    }
}

// Calling this function removes the sneak peek modal from the DOM, deletes it from the global tracking object,
// and unhides the corresponding dot which spawned it.
function closeSneakPeek(modalId) {
    //console.log('closeSneakPeek()');

    let dotId = modalId.substring(0, modalId.indexOf('-sneak-peek-modal'));

    removeSneakPeekModal(modalId, function() {
        $(`#${dotId}`).show();
    });
}

function showSneakPeekModal(seg) {
    //console.log('showSneakPeekModal()');

    let sneakPeekModal = createSneakPeekModal(seg);
    let modalId = sneakPeekModal.attr('id');
    let videoElement = $('body').find('video,iframe');
    let videoWidth = $(videoElement).width();
    let videoHeight = $(videoElement).height();

    putElementOnVideo(sneakPeekModal);
    doModalBoundsCheck(sneakPeekModal, videoWidth, videoHeight); // check if the modal is going out of the video bounds and reposition

    sneakPeekModal.show();
    $(`#${seg.id}`).hide(); // hide the dot/icon underneath the sneak-peek modal

    sneakPeekModals[modalId] = sneakPeekModal;

    return modalId;
}

function onMouseLeaveSneakPeek(event, modalId) {
    //console.log('onMouseLeaveSneakPeek()');

    closeSneakPeek(modalId);
}

function removeSneakPeekModal(modalId, doneCallback) {
    //console.log('removeSneakPeekModal()');

    let sneakPeekModal = $(`#${modalId}`);
    if (!sneakPeekModal) return;

    sneakPeekModal.fadeOut('fast', function() {
        sneakPeekModal.remove();

        if (modalId in sneakPeekModals) {
            delete sneakPeekModals[modalId];
        }

        if (doneCallback !== undefined) {
            doneCallback();
        }
    });
}

function removeModal(modalId, noAnimation = false) {
    //console.log('removeModal()');

    let modal = $(`#${modalId}`);
    if (!modal) return;

    if (noAnimation) {
        modal.remove();

        if (modalId in modals) {
            delete modals[modalId];
        }
    } else {
        modal.fadeOut('fast', function() {
            modal.remove();

            if (modalId in modals) {
                delete modals[modalId];
            }
        });
    }
}

function createSneakPeekModal(seg) {
    //console.log('createSneakPeekModal()');

    // TODO: a lot of this code comes from the original modal creation code - refactor into one function
    let timelineColor = dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor;
    let modalId = `${seg.id}-sneak-peek-modal`;
    let modal = $('<div />')
        .attr('id', modalId)
        .attr('onmouseleave', `onMouseLeaveSneakPeek(event || window.event, "${modalId}")`);
    let form = $('<form />');
    let table = $('<table />');

    if (!timelineColor) {
        timelineColor = 'blue';
    }

    modal.append(form);
    form.append(table);

    let thumbnailImageURL = seg.dataObject.mainImageUrl;
    let headingText = '';
    let imgNode = null;

    if (thumbnailImageURL) {
        imgNode = $('<img />')
            .attr('src', thumbnailImageURL)
            .css({
                width: '60px',
                display: 'block',
                margin: '0 auto',
                'box-sizing': 'border-box',
                'max-width': '100%',
                'max-height': '100%',
            });
    }

    let dataType = dataTypesDictionary[seg.dataObject.dataTypeId];

    for (let i = 0; i < dataType.fields.length; i++) {
        let field = dataType.fields[i];

        if (field.options.includes('nameField')) {
            headingText = seg.dataObject.name;
            break;
        }
    }

    headingText = headingText || '(No Name)';

    let headingRow = $('<tr />');
    let tableCell = $("<td colspan='2'/>");
    let headingTextColor = 'black';

    headingRow.css({
        background: timelineColor,
        color: headingTextColor,
        border: `1px solid ${timelineColor}`,
        'font-weight': 'bold',
        'text-align': 'center',
    });

    tableCell.append($('<span />').html(headingText));
    headingRow.append(tableCell);

    if (imgNode) {
        let tr = $('<tr />');
        let td = $("<td colspan='2'/>");
        tr.append(td);
        td.append(imgNode);
        table.prepend(tr);
    }

    table.prepend(headingRow);

    let modalX = seg.startBounds.ui.x;
    let modalY = seg.startBounds.ui.y;
    let videoElement = $('body').find('video,iframe');
    let videoHeight = $(videoElement).height();

    modal.css({
        left: `${modalX}px`,
        top: `${modalY}px`,
        position: 'absolute',
        border: `1px solid ${timelineColor}`,
        background: '#ddd',
        display: 'none',
        'max-height': videoHeight,
        'max-width': '70%',
        opacity: 0.8,
    });

    modal.attr('onclick', `onSneakPeekClick(event || window.event, "${seg.id}")`);

    return modal;
}

function onSneakPeekClick(event, segmentId) {
    //console.log('onSneakPeekClick()');

    // prevent this event from bubbling to the video container div
    event.stopPropagation();
    onDotClick(event, segmentId);
}

function onDotClick(event, segmentId) {
    //console.log('onDotClick()');

    // Prevent the onclick event of the video container from being fired. Basically the event should not propogate "downward" since
    // now the "dot" elements sit on the video container div and _not_ the body element. The dots were changed from sitting on the
    // body element, to sitting on the video container div, because we now detect whether the mouse is hovering over the video.
    // If the dots were a child element of the body, then onmouseleave (on the video container) would get fired upon entering a
    // dot and onmouseenter would get refired when exiting a dot (entering the video) - in other words, the dots would act like
    // "holes" in the video container. The onmouseenter/onmouseleave events are only supposed to fire on the element they sit on and
    // not include any children of that element (unlike onmouseover). But since our dots were NOT child elements of the video container,
    // that's why onmouseenter/onmouseleave "seemed" to behave incorrectly. It wasn't incorrect, the dot should've been on the video
    // container div all along. But this causes a problem now with event bubbling - the video container div now gets the same onclick
    // event as the dot itself (the event that caused this onDotClick function to fire). So we must stop the event bubbling right here
    // by calling event.stopPropagation().
    event.stopPropagation();
    window.sourcePlayer.pause();

    let seg = activeSegmentObjects[segmentId];

    if (!seg) {
        // this would happen if a user clicks on a dot exactly as it's fading out - it will no longer be in activeSegmentObjects (this is
        // because activeSegmentObjects comes from embed.cshtml which wraps all this custom script code - it sees that the segment has ended
        // and removes it from activeSegmentObjects - there's no way for it to know that this script is in the middle of a fade-out)
        return;
    }

    let timelineColor = dataTypesDictionary[seg.dataObject.dataTypeId].timelineColor;
    let fieldsToDisplay = getFieldsForModal(seg.dataObject);
    let modalId = `${segmentId}-modal`;
    let modal = $('<div />').attr('id', modalId);
    let form = $('<form />');
    let table = $('<table />');

    if (!timelineColor) {
        timelineColor = 'blue';
    }

    modal.append(form);
    form.append(table);

    let thumbnailImageURL = seg.dataObject.mainImageUrl;
    let headingText = '';
    let actionURL = '';
    let actionFieldName = '';
    let hardCodedFields = [];

    // we are hard-coding some of the data type fields for the demo...
    if (seg.dataTypeName == 'castMember') {
        console.log('Using castMember fields...');
        hardCodedFields.push('role');
        hardCodedFields.push('bio');
        hardCodedFields.push('imdbLink');

        actionFieldName = 'imdbLink';
    } else if (seg.dataTypeName == 'brand') {
        console.log('Using brand/costume fields...');
        hardCodedFields.push('displayLink');

        actionFieldName = 'displayLink';
    } else if (seg.dataTypeName == 'music') {
        console.log('Using music fields...');
        hardCodedFields.push('artist');
        hardCodedFields.push('shoppingLink');

        actionFieldName = 'shoppingLink';
    } else if (seg.dataTypeName == 'location') {
        console.log('Using locations fields...');
        hardCodedFields.push('address');
        hardCodedFields.push('description');
    } else if (seg.dataTypeName == 'product') {
        hardCodedFields.push('description');
        hardCodedFields.push('shoppingLink');

        actionFieldName = 'shoppingLink';
    }

    let thumbnailRootElement = null;
    let imgNode = null;
    let href = '';

    if (thumbnailImageURL) {
        imgNode = $('<img />')
            .attr('src', thumbnailImageURL)
            .css({
                width: '60px',
                display: 'block',
                margin: '0 auto',
                'box-sizing': 'border-box',
                'max-width': '100%',
                'max-height': '100%',
            });
    }

    if (actionFieldName) {
        href = seg.dataObject.data[actionFieldName];
    }

    if (seg.dataTypeName == 'location') {
        // TODO: we don't have long/lat filled in for our data yet
        // ...so instead, parse them from the address field itself
        // let pattern = /\(([^)]+)\)/;
        // let latLongString = seg.dataObject.data['address'].match(pattern);
        //
        // if (latLongString) {
        //     let location = latLongString[1].split(',');
        //     let latitude = location[0].trim();
        //     let longitude = location[1].trim();
        //
        //     if (longitude && latitude) {
        //         href = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`; //,16z`;
        //     } else {
        //         href = `https://www.google.com/maps/search/?api=1&query=${encodeURI(seg.dataObject.data['address'])}`;
        //     }
        // }

        // Actually, I like plugging in the address instead because google will show a bunch more information about the
        // location (but will only show lat/long on the left sidebar if searching by coordinates only); I'm keeping the
        // code above in case we need it in the future.
        href = `https://www.google.com/maps/search/?api=1&query=${encodeURI(seg.dataObject.data['address'])}`;
    }

    if (imgNode && (seg.dataTypeName == 'product' || seg.dataTypeName == 'music' || seg.dataTypeName == 'brand' || seg.dataTypeName == 'castMember' || seg.dataTypeName == 'location')) {
        let anchorTag = $('<a />')
            .attr('href', href)
            .attr('target', '_blank');

        anchorTag.append(imgNode);

        thumbnailRootElement = anchorTag;
    } else if (imgNode) {
        thumbnailRootElement = imgNode;
    }

    if (hardCodedFields.length == 0) {
        for (let fieldId in fieldsToDisplay) {
            if (fieldsToDisplay.hasOwnProperty(fieldId)) {
                let field = fieldsToDisplay[fieldId];
                let fieldValueClass = 'field-text';

                if (field.options.includes('descriptionField')) {
                    fieldValueClass = 'field-text-block';
                }

                if (field.options.includes('nameField')) {
                    headingText = seg.dataObject.name;
                }

                if (field.name == 'actionURL') {
                    actionURL = seg.dataObject.data['actionURL'];
                    continue;
                }

                let textValue = seg.dataObject.data[field.name];
                let tableRow = $('<tr />');
                let tableCell1 = $("<td class='field-name'/>");
                let tableCell2 = $(`<td />`);
                let fieldNameNode = $(`<span />`).html(field.displayName);
                let fieldValueNode = $(`<span class='${fieldValueClass}' />`).html(textValue);

                table.append(tableRow.append(tableCell1.append(fieldNameNode)), tableRow.append(tableCell2.append(fieldValueNode)));
            }
        }
    } else {
        // the hard-coded stuff for the demo
        headingText = seg.dataObject.name;

        for (let i = 0; i < hardCodedFields.length; i++) {
            let field = hardCodedFields[i];
            let fieldValueClass = 'field-text';

            if (field == 'description' || field == 'bio') {
                fieldValueClass = 'field-text-block';
            }

            if (field == actionFieldName) {
                actionURL = seg.dataObject.data[actionFieldName];
                continue;
            }

            let dataField = getFieldByName(field, seg.dataObject);
            let textValue = seg.dataObject.data[field];
            let tableRow = $('<tr />');
            let nameCell = $("<td class='field-name'/>");
            let valueCell = $('<td />');
            let fieldNameNode = $(`<span />`).html(dataField.displayName);
            let fieldValueNode = null;

            if (seg.dataTypeName == 'location' && field == 'address') {
                fieldValueNode = $('<a />')
                    .attr('href', href)
                    .attr('target', '_blank');

                fieldValueNode.append($(`<span class='${fieldValueClass}' />`).html(textValue));
            } else {
                fieldValueNode = $(`<span class='${fieldValueClass}' />`).html(textValue);
            }

            table.append(tableRow.append(nameCell.append(fieldNameNode)), tableRow.append(valueCell.append(fieldValueNode)));
        }
    }

    if (actionURL) {
        let tableRow = $('<tr />');
        let tableCell = $("<td colspan='2' style='text-align: center'/>");
        tableRow.append(tableCell);
        tableCell.append($('<input class="more-info-btn" type="submit" value="More"/>'));
        form.attr('action', actionURL).attr('target', '_blank');
        table.append(tableRow);
    }

    headingText = headingText || '(No Name)';

    let headingRow = $('<tr />');
    let tableCell = $("<td colspan='2'/>");
    let headingTextColor = 'black';

    headingRow.css({
        background: timelineColor,
        color: headingTextColor,
        border: `1px solid ${timelineColor}`,
        'font-weight': 'bold',
        'text-align': 'center',
    });

    tableCell.append($('<span />').html(headingText));
    headingRow.append(tableCell);

    if (thumbnailRootElement) {
        let tr = $('<tr />');
        let td = $("<td colspan='2'/>");

        tr.append(td);
        td.append(thumbnailRootElement);
        table.prepend(tr);
    }

    table.prepend(headingRow);

    let modalX = seg.startBounds.ui.x;
    let modalY = seg.startBounds.ui.y;
    let videoElement = $('body').find('video,iframe');
    let videoWidth = $(videoElement).width();
    let videoHeight = $(videoElement).height();

    modal.css({
        left: `${modalX}px`,
        top: `${modalY}px`,
        position: 'absolute',
        border: `1px solid ${timelineColor}`,
        background: '#ddd',
        display: 'none', // this is so it doesn't show immediately when adding it to the DOM, so we can fade-in
        'max-height': videoHeight,
        'max-width': '70%',
        opacity: 0.8, // but we still want a little transparency
        //        'z-index': 99999999,
    });

    modal.attr('onclick', `onModalClick(event || window.event)`);

    putElementOnVideo(modal);
    doModalBoundsCheck(modal, videoWidth, videoHeight); // check if the modal is going out of the video bounds and reposition

    let dotElement = $(`#${seg.id}`);
    //console.log(`fading dot element ID = ${seg.id}`);

    dotElement.fadeOut('fast');
    modal.fadeIn('slow');

    // close all other modals but the current one
    // TODO: Fix this...
    // for (let id in modals) {
    //     if (id != modalId) {
    //         // modalId == ID of the modal that was just created above
    //         removeModal(id, true);
    //     }
    // }

    hiddenDots[seg.id] = dotElement;
    modals[modalId] = modal;
}

function doModalBoundsCheck(modal, videoWidth, videoHeight) {
    let modalX = parseFloat(modal.css('left'));
    let modalY = parseFloat(modal.css('top'));

    // check if the modal is going out of the video bounds and reposition
    setTimeout(function() {
        let modalWidth = modal.width();
        let modalHeight = modal.height();
        let rightX = modalX + modalWidth;
        let bottomY = modalY + modalHeight;

        if (rightX > videoWidth) {
            modalX -= rightX - videoWidth;

            // Reposition the x coordinate of the modal and then recalc max width. This is needed because changing the modal's x coord
            // will make the browser expand the modal's width (assuming there's enough content) on the next render cycle and it would
            // still go off the screen.
            modal.css('left', modalX);
            modal.css('max-width', videoWidth - modalX);
        }

        if (bottomY > videoHeight) {
            modalY -= bottomY - videoHeight;

            modal.css('top', modalY);
            modal.css('max-height', videoHeight - modalY);
        }
    }, 0);
}

function onModalClick(event) {
    //console.log('onModalClick()');
    // ...because the click event will also fall through to the video container div, which we obviously don't want
    event.stopPropagation();
}

function onVideoClicked() {
    //console.log('onVideoClicked');

    if (displayMode == ExperienceDisplayMode.HOTSPOTS) {
        // hide all modals
        for (let modalId in modals) {
            $(`#${modalId}`).remove();
            delete modals[modalId];
        }

        for (let modalId in sneakPeekModals) {
            $(`#${modalId}`).remove();
            delete sneakPeekModals[modalId];
        }

        // put the dots back
        for (let invisibleDotId in hiddenDots) {
            hiddenDots[invisibleDotId].fadeIn('slow');
            delete hiddenDots[invisibleDotId];
        }
    }

    window.sourcePlayer.play();
}

function onMouseEnterVideo() {
    isMouseOverVideo = true;
    //console.log('on mouse enter video');

    if (displayMode == ExperienceDisplayMode.HOTSPOTS) {
        for (let dotId in activeDots) {
            if (activeDots.hasOwnProperty(dotId) && !(dotId in hiddenDots)) {
                $(`#${dotId}`).fadeIn('fast');
            }
        }
    } else if (displayMode == ExperienceDisplayMode.X_RAY) {
        // if (showMode == ShowMode.CURRENT_OBJECT_LIST) {
        //     $(`.x-ray-display`).css('display', 'block');
        // } else if (showMode == ShowMode.VIEW_ALL) {
        //     $(`.x-ray-view-all`).css('display', 'block');
        // } else if (showMode == ShowMode.DETAILS) {
        // }

        switchXRayViewMode(showMode);
    }
}

function onMouseLeaveVideo() {
    isMouseOverVideo = false;

    if (displayMode == ExperienceDisplayMode.HOTSPOTS) {
        //console.log('on mouse leave video');
        for (let dotId in activeDots) {
            if (activeDots.hasOwnProperty(dotId)) {
                $(`#${dotId}`).fadeOut('fast');
            }
        }

        for (let modalId in sneakPeekModals) {
            if (sneakPeekModals.hasOwnProperty(modalId)) {
                removeSneakPeekModal(modalId);
            }
        }
    } else if (displayMode == ExperienceDisplayMode.X_RAY) {
        //$(`.x-ray-display`).css('display', 'none');
        //$(`.x-ray-view-all`).css('display', 'none');
    }
}

$(function() {
    init();
});
