import React, { Component } from 'react';
import {
  BackHandler,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart } from 'victory-native';

import languages from './../locales/languages';
import NavigationBarWrapper from '../components/NavigationBarWrapper';
import colors from '../constants/colors';
import Colors from '../constants/colors';
import fontFamily from '../constants/fonts';
import { CROSSED_PATHS } from '../constants/storage';
import { GetStoreData } from '../helpers/General';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;
const max_exposure_window = 14; // Two weeks is the longest view that matters
const bin_duration = 5; // each bin count represents a 5 minute period

// Thresholds are the number of counts in the intersection bins (5 minute
// timeframse) which are used to provide user interface hints.
// TODO: These thresholds semi-arbitrary, this could use some medical research.
const Threshold = {
  HIGH: 96, // 96 * 5 minutes = eight hours
  MEDIUM: 36, // 36 * 5 minutes = three hours
  LOW: 12, // 12 * 5 minutes = one hour
  LOWEST: 0, // 0 * 5 minutes = no known exposure!
};

class NotificationScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
    };
    this.getInitialState();
  }

  backToMain() {
    this.resetState();
    this.props.navigation.goBack();
  }

  goToSettings() {
    this.resetState();
    this.props.navigation.navigate('ChooseProviderScreen', {});
  }

  handleBackPress = () => {
    this.resetState();
    this.props.navigation.goBack();
    return true;
  };

  componentDidMount() {
    this.refreshState();
    BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.handleBackPress);
  }

  refreshState() {
    this.getInitialState();
  }

  resetState() {}

  getInitialState = async () => {
    GetStoreData(CROSSED_PATHS).then(dayBin => {
      console.log(dayBin);

      /* DEBUGGING TOOL -- handy for creating faux data
      let pseudoBin = [];
      for (var i = 0; i < 28; i++) {
        // Random Integer between 0-99
        const intersections = Math.floor((Math.random() * 500) / 300);
        pseudoBin.push(intersections);
      }
      dayBin = JSON.stringify(pseudoBin);
      */

      if (dayBin === null) {
        this.setState({ dataAvailable: false });
        console.log("Can't found Crossed Paths");
      } else {
        var crossed_path_data = [];
        console.log('Found Crossed Paths');
        this.setState({ dataAvailable: true });
        let dayBinParsed = JSON.parse(dayBin);

        // Don't display more than two weeks of crossing data
        for (
          var i = 0;
          i < dayBinParsed.length && i < max_exposure_window;
          i++
        ) {
          const val = dayBinParsed[i];
          let data = { x: i, y: val, fill: this.colorfill(val) };
          crossed_path_data.push(data);
        }
        this.setState({ data: crossed_path_data });
      }
    });
  };

  colorfill(data) {
    var color = colors.LOWEST_RISK;
    if (data > Threshold.LOW) {
      color = colors.LOWER_RISK;
    }
    if (data > Threshold.MEDIUM) {
      color = colors.MIDDLE_RISK;
    }
    if (data > Threshold.HIGH) {
      color = colors.HIGHEST_RISK;
    }
    return color;
  }

  render() {
    const hasExposure = this.state.data.some(point => point.y > 0);

    return (
      <NavigationBarWrapper
        title={languages.t('label.event_history_title')}
        onBackPress={this.backToMain.bind(this)}>
        <View style={styles.main}>
          <Text style={styles.pageTitle}>
            {languages.t('label.notification_title')}
          </Text>
          {this.state.dataAvailable ? (
            <>
              <VictoryChart
                height={0.25 * height}
                padding={{ top: 20, bottom: 50, left: 20, right: 40 }}
                margin={0}
                dependentAxis={true}>
                <VictoryAxis
                  dependentAxis={false}
                  tickCount={max_exposure_window}
                  tickFormat={t =>
                    t == 1
                      ? languages.t('label.notification_today')
                      : t == 12
                      ? languages.t('label.notification_2_weeks_ago')
                      : ''
                  }
                />

                <VictoryBar
                  alignment='start'
                  barRatio={0.8}
                  animate={{
                    duration: 2000,
                    onLoad: { duration: 1000 },
                  }}
                  style={{
                    data: {
                      fill: ({ datum }) => datum.fill,
                    },
                  }}
                  data={this.state.data}
                />
              </VictoryChart>

              <View style={styles.fullDivider} />

              <ScrollView contentContainerStyle={styles.contentContainer}>
                {this.state.data.map(data =>
                  data.y === 0 ? (
                    data.x == max_exposure_window - 1 && !hasExposure ? (
                      <Text style={styles.noExposure}>
                        {languages.t('label.notifications_no_exposure')}
                      </Text>
                    ) : (
                      <Text style={{ height: 0 }}></Text>
                    )
                  ) : (
                    <View key={data.x} style={styles.notificationView}>
                      <Text style={[styles.notificationsText]}>
                        {data.x == 0
                          ? languages.t(
                              'label.notifications_exposure_format_today',
                              { exposureTime: data.y * bin_duration },
                            )
                          : data.x == 1
                          ? languages.t(
                              'label.notifications_exposure_format_yesterday',
                              { exposureTime: data.y * bin_duration },
                            )
                          : languages.t('label.notifications_exposure_format', {
                              daysAgo: data.x,
                              exposureTime: data.y * bin_duration,
                            })}
                      </Text>
                      <View style={styles.divider} />
                    </View>
                  ),
                )}
                <Text style={styles.whatNextHeader}>What does this mean?</Text>
                <Text style={styles.whatNextBody}>
                  Individuals who don't exhibit symptoms can sometimes still
                  carry the infection and infect others. Being careful about
                  social distancing and coming in contact with large groups or
                  at risk individuals (the elderly, those with significant other
                  medical issues) is important to manage both your risk and the
                  risk to others.
                </Text>
                <Text style={styles.whatNextBody}>
                  If you have no symptoms but still would like to be tested you
                  can go to your nearest testing site.
                </Text>
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.mainText}>
                {languages.t('label.notification_data_not_available')}
              </Text>
              <Text style={styles.mainText}>
                {languages.t('label.notification_warning_text')}
              </Text>
              <TouchableOpacity
                style={styles.buttonTouchable}
                onPress={() => this.goToSettings()}>
                <Text style={styles.buttonText}>
                  {languages.t('label.notification_random_data_button')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </NavigationBarWrapper>
    );
  }
}

const styles = StyleSheet.create({
  // Container covers the entire screen
  container: {
    flex: 1,
    flexDirection: 'column',
    color: colors.PRIMARY_TEXT,
    backgroundColor: colors.WHITE,
  },
  main: {
    flex: 1,
    paddingVertical: 20,
    width: '100%',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    color: colors.PRIMARY_TEXT,
    backgroundColor: colors.WHITE,
  },
  buttonTouchable: {
    borderRadius: 12,
    backgroundColor: '#665eff',
    alignSelf: 'center',
    width: width * 0.7866,
    marginTop: 30,
    justifyContent: 'center',
    paddingVertical: 15,
    width: '90%',
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fontFamily.primaryBold,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: 0,
    textAlign: 'center',
    color: '#ffffff',
  },
  mainText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamily.primaryRegular,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 10,
    marginTop: 20,
    overflow: 'scroll',
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: fontFamily.primaryRegular,
    marginLeft: 20,
  },
  backArrow: {
    height: 18,
    width: 18.48,
  },
  notificationsHeader: {
    backgroundColor: '#665eff',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  notificationsHeaderText: {
    color: colors.WHITE,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fontFamily.primaryBold,
  },
  notificationView: {
    width: '100%',
    paddingVertical: 5,
    paddingHorizontal: 20,
  },
  notificationsText: {
    color: colors.BLACK,
    fontSize: 16,
    paddingHorizontal: 10,
    fontFamily: fontFamily.primaryRegular,
  },
  noExposure: {
    margin: 30,
    color: 'forestgreen',
    fontSize: 20,
    textAlign: 'center',
    fontFamily: fontFamily.primaryMedium,
  },
  divider: {
    marginTop: 15,
    backgroundColor: Colors.DIVIDER,
    height: 1.5,
  },
  fullDivider: {
    backgroundColor: Colors.DIVIDER,
    height: 1,
    width: '100%',
  },
  whatNextHeader: {
    fontSize: 24,
    fontFamily: fontFamily.primaryBold,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  whatNextBody: {
    fontSize: 20,
    fontFamily: fontFamily.primaryRegular,
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
});

export default NotificationScreen;
