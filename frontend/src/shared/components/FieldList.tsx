import React, {PureComponent} from 'react'
import _ from 'lodash'

import {
  ApplyFuncsToFieldArgs,
  Field,
  FieldFunc,
  GroupBy,
  QueryConfig,
  Source,
  TimeShift,
} from 'src/types'

import {FIELD_DESCRIPTIONS} from 'src/shared/constants/measurementFieldDesc'

import QueryOptions from 'src/shared/components/QueryOptions'
import FieldListItem from 'src/data_explorer/components/FieldListItem'
import FancyScrollbar from 'src/shared/components/FancyScrollbar'

import {showFieldKeys} from 'src/shared/apis/metaQuery'
import parseShowFieldKeys from 'src/shared/parsing/showFieldKeys'
import {
  functionNames,
  numFunctions,
  getFieldsWithName,
  getFuncsByFieldName,
} from 'src/shared/reducers/helpers/fields'
import {ErrorHandling} from 'src/shared/decorators/errors'

interface GroupByOption extends GroupBy {
  menuOption: string
}

interface TimeShiftOption extends TimeShift {
  text: string
}
interface Links {
  proxy: string
}

interface Props {
  query: QueryConfig
  addInitialField?: (field: Field, groupBy: GroupBy) => void
  applyFuncsToField: (field: ApplyFuncsToFieldArgs, groupBy?: GroupBy) => void
  onFill?: (fill: string) => void
  onGroupByTime: (groupByOption: string) => void
  onTimeShift?: (shift: TimeShiftOption) => void
  onToggleField: (field: Field) => void
  removeFuncs: (fields: Field[]) => void
  isKapacitorRule?: boolean
  querySource?: {
    links: Links
  }
  initialGroupByTime?: string | null
  isQuerySupportedByExplorer?: boolean
  source: Source
}

interface State {
  fields: Field[]
}

@ErrorHandling
class FieldList extends PureComponent<Props, State> {
  public static defaultProps: Partial<Props> = {
    isKapacitorRule: false,
    initialGroupByTime: null,
  }

  constructor(props) {
    super(props)
    this.state = {
      fields: [],
    }
  }

  public componentDidMount() {
    const {database, measurement} = this.props.query
    if (!database || !measurement) {
      return
    }

    this.getFields()
  }

  public componentDidUpdate(prevProps) {
    const {querySource, query} = this.props
    const {database, measurement, retentionPolicy} = query
    const {
      database: prevDB,
      measurement: prevMeas,
      retentionPolicy: prevRP,
    } = prevProps.query
    if (!database || !measurement) {
      return
    }

    if (
      database === prevDB &&
      measurement === prevMeas &&
      retentionPolicy === prevRP &&
      _.isEqual(prevProps.querySource, querySource)
    ) {
      return
    }

    this.getFields()
  }

  public render() {
    const {
      query: {database, measurement, fields = [], groupBy, fill, shifts},
      isQuerySupportedByExplorer,
      isKapacitorRule,
    } = this.props

    const hasAggregates = numFunctions(fields) > 0
    const noDBorMeas = !database || !measurement
    const isDisabled = !isKapacitorRule && !isQuerySupportedByExplorer

    return (
      <div className="query-builder--column">
        <div className="query-builder--heading">
          <span>Fields</span>
          {hasAggregates ? (
            <QueryOptions
              fill={fill}
              shift={_.first(shifts)}
              groupBy={groupBy}
              onFill={this.handleFill}
              isKapacitorRule={isKapacitorRule}
              onTimeShift={this.handleTimeShift}
              onGroupByTime={this.handleGroupByTime}
              isDisabled={isDisabled}
            />
          ) : null}
        </div>
        {noDBorMeas ? (
          <div className="query-builder--list-empty">
            <span>
              No <strong>Measurement</strong> selected
            </span>
          </div>
        ) : (
          <div className="query-builder--list">
            <FancyScrollbar>
              {this.state.fields.map((fieldFunc, i) => {
                const selectedFields = getFieldsWithName(
                  fieldFunc.value,
                  fields
                )

                const funcs: FieldFunc[] = getFuncsByFieldName(
                  fieldFunc.value,
                  fields
                )

                const fieldFuncs = selectedFields.length
                  ? [this.addDesc(_.head(selectedFields), fieldFunc.desc)]
                  : [fieldFunc]

                return (
                  <FieldListItem
                    key={i}
                    onToggleField={this.handleToggleField}
                    onApplyFuncsToField={this.handleApplyFuncs}
                    isSelected={!!selectedFields.length}
                    fieldFuncs={fieldFuncs}
                    funcs={functionNames(funcs)}
                    isKapacitorRule={isKapacitorRule}
                    isDisabled={isDisabled}
                  />
                )
              })}
            </FancyScrollbar>
          </div>
        )}
      </div>
    )
  }

  private addDesc = (selectedField: FieldFunc, desc: string) => {
    selectedField.desc = desc
    return selectedField
  }

  private handleGroupByTime = (groupBy: GroupByOption): void => {
    this.props.onGroupByTime(groupBy.menuOption)
  }

  private handleFill = (fill: string): void => {
    this.props.onFill(fill)
  }

  private handleToggleField = (field: Field) => {
    const {
      query,
      onToggleField,
      addInitialField,
      initialGroupByTime: time,
      isKapacitorRule,
      isQuerySupportedByExplorer,
    } = this.props
    const {fields, groupBy} = query
    const isDisabled = !isKapacitorRule && !isQuerySupportedByExplorer

    if (isDisabled) {
      return
    }
    const initialGroupBy = {...groupBy, time}

    if (!_.size(fields)) {
      return isKapacitorRule
        ? onToggleField(field)
        : addInitialField(field, initialGroupBy)
    }

    onToggleField(field)
  }

  private handleApplyFuncs = (fieldFunc: ApplyFuncsToFieldArgs): void => {
    const {
      query,
      removeFuncs,
      applyFuncsToField,
      initialGroupByTime: time,
    } = this.props
    const {groupBy, fields} = query
    const {funcs} = fieldFunc

    // If one field has no funcs, all fields must have no funcs
    if (!_.size(funcs)) {
      return removeFuncs(fields)
    }

    // If there is no groupBy time, set one
    if (!groupBy.time) {
      return applyFuncsToField(fieldFunc, {...groupBy, time})
    }

    applyFuncsToField(fieldFunc, groupBy)
  }

  private handleTimeShift = (shift: TimeShiftOption): void => {
    this.props.onTimeShift(shift)
  }

  private getFields = (): void => {
    const {database, measurement, retentionPolicy} = this.props.query
    const {querySource, source} = this.props

    const proxy =
      _.get(querySource, ['links', 'proxy'], null) ||
      _.get(source, ['links', 'proxy'], null)

    showFieldKeys(proxy, database, measurement, retentionPolicy).then(resp => {
      const {errors, fieldSets} = parseShowFieldKeys(resp.data)
      if (errors.length) {
        console.error('Error parsing fields keys: ', errors)
      }

      const newFields = _.get(fieldSets, measurement, []).map((f: any) => ({
        value: f,
        type: 'field',
        desc: _.get(FIELD_DESCRIPTIONS, `${measurement}.${f}`),
      }))

      this.setState({
        fields: newFields,
      })
    })
  }
}

export default FieldList
