import * as React from 'react'
import Devices, {Props} from '.'
import * as DevicesGen from '../actions/devices-gen'
import * as RouteTreeGen from '../actions/route-tree-gen'
import * as Constants from '../constants/devices'
import * as I from 'immutable'
import * as Kb from '../common-adapters'
import {compose, isMobile, namedConnect, safeSubmitPerMount} from '../util/container'
import {partition} from 'lodash-es'
import {HeaderTitle, HeaderRightActions} from './nav-header/container'

const mapStateToProps = state => ({
  _deviceMap: state.devices.deviceMap,
  _newlyChangedItemIds: state.devices.isNew,
  waiting: Constants.isWaiting(state),
})

const mapDispatchToProps = (dispatch, {navigateAppend, navigation}) => ({
  clearBadges: () => dispatch(DevicesGen.createClearBadges()),
  loadDevices: () => dispatch(DevicesGen.createLoad()),
  onAddDevice: (highlight?: Array<'computer' | 'phone' | 'paper key'>) => {
    // We don't have navigateAppend in upgraded routes
    dispatch(RouteTreeGen.createNavigateAppend({path: [{props: {highlight}, selected: 'deviceAdd'}]}))
  },
  onBack: () => dispatch(RouteTreeGen.createNavigateUp()),
})

const sortDevices = (a, b) => {
  if (a.currentDevice) return -1
  if (b.currentDevice) return 1
  return a.name.localeCompare(b.name)
}

const deviceToItem = d => ({id: d.deviceID, key: d.deviceID, type: 'device'})
const splitAndSortDevices = deviceMap =>
  partition(
    deviceMap
      .valueSeq()
      .toArray()
      .sort(sortDevices),
    d => d.revokedAt
  )

type OwnProps = {}

function mergeProps(stateProps, dispatchProps, ownProps: OwnProps) {
  const [revoked, normal] = splitAndSortDevices(stateProps._deviceMap)
  const revokedItems = revoked.map(deviceToItem)
  const newlyRevokedIds = I.Set(revokedItems.map(d => d.key)).intersect(stateProps._newlyChangedItemIds)
  const showPaperKeyNudge =
    !stateProps._deviceMap.isEmpty() && !stateProps._deviceMap.some(v => v.type === 'backup')
  return {
    _stateOverride: null,
    clearBadges: dispatchProps.clearBadges,
    hasNewlyRevoked: newlyRevokedIds.size > 0,
    items: normal.map(deviceToItem),
    loadDevices: dispatchProps.loadDevices,
    onAddDevice: dispatchProps.onAddDevice,
    onBack: dispatchProps.onBack,
    revokedItems: revokedItems,
    showPaperKeyNudge,
    title: 'Devices',
    waiting: stateProps.waiting,
  }
}

class ReloadableDevices extends React.PureComponent<
  Props & {
    clearBadges: () => void
  }
> {
  componentWillUnmount() {
    this.props.clearBadges()
  }

  render() {
    return (
      <Kb.Reloadable
        onBack={isMobile ? this.props.onBack : undefined}
        waitingKeys={Constants.waitingKey}
        onReload={this.props.loadDevices}
        reloadOnMount={true}
        title={this.props.title}
      >
        <Devices
          _stateOverride={this.props._stateOverride}
          onAddDevice={this.props.onAddDevice}
          hasNewlyRevoked={this.props.hasNewlyRevoked}
          items={this.props.items}
          loadDevices={this.props.loadDevices}
          onBack={this.props.onBack}
          revokedItems={this.props.revokedItems}
          showPaperKeyNudge={this.props.showPaperKeyNudge}
          title={this.props.title}
          waiting={this.props.waiting}
        />
      </Kb.Reloadable>
    )
  }
}

const Connected = compose(
  namedConnect(mapStateToProps, mapDispatchToProps, mergeProps, 'Devices'),
  safeSubmitPerMount(['onBack'])
)(ReloadableDevices)

if (!isMobile) {
  // @ts-ignore fix this
  Connected.navigationOptions = {
    header: undefined,
    headerRightActions: HeaderRightActions,
    headerTitle: HeaderTitle,
    title: 'Devices',
  }
}

export default Connected
