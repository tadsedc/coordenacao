import unittest
from gerar_horario import solve


class SchedulingTests(unittest.TestCase):
    def ead_config(self, available):
        return {'total_slots': 10,
                'professores': [{'id': 'p', 'disponiveis': available, 'max_noites': 3}],
                'ofertas': [{'id': 'a', 'professor': None, 'blocos': 2, 'modalidade': 'ead',
                             'componentes': [{'turma': 'ADS1', 'disciplina': 'A'}]},
                            {'id': 'b', 'professor': 'p', 'blocos': 2,
                             'componentes': [{'turma': 'ADS1', 'disciplina': 'B'}]}]}

    def test_ead_prefers_friday(self):
        config = self.ead_config(list(range(10)))
        config['professores'] = []
        config['ofertas'] = config['ofertas'][:1]
        result = solve(config)['aulas']
        self.assertEqual({a['slot'] for a in result}, {8, 9})
        self.assertTrue(all(a['modalidade'] == 'ead' for a in result))
        self.assertTrue(all(a['professor'] is None for a in result))

    def test_ead_falls_back_to_thursday(self):
        config = self.ead_config([8, 9])
        result = [a for a in solve(config)['aulas'] if a['modalidade'] == 'ead']
        self.assertEqual({a['slot'] for a in result}, {6, 7})

    def test_ead_does_not_use_other_days(self):
        with self.assertRaisesRegex(ValueError, 'Não existe horário'):
            config = self.ead_config(list(range(10)))
            config['ofertas'][1]['blocos'] = 10
            config['professores'][0]['max_noites'] = 5
            solve(config)

    def test_nights_are_chosen_by_solver_with_day_restriction(self):
        available = [0, 1, 4, 5, 6, 7, 8, 9]
        result = solve({'total_slots': 10,
                        'professores': [{'id': 'p', 'disponiveis': available, 'max_noites': 3}],
                        'ofertas': [{'id': 'a', 'professor': 'p', 'blocos': 6,
                                     'componentes': [{'turma': 'ADS1', 'disciplina': 'A'}]}]})['aulas']
        self.assertEqual(len(result), 6)
        self.assertEqual(len({a['slot'] // 2 for a in result}), 3)
        self.assertTrue(all(a['slot'] in available for a in result))

    def test_night_limit_applies_across_different_offers(self):
        with self.assertRaisesRegex(ValueError, 'Não existe horário'):
            solve({'total_slots': 10,
                   'professores': [{'id': 'p', 'disponiveis': list(range(10)), 'max_noites': 1}],
                   'ofertas': [{'id': str(i), 'professor': 'p', 'blocos': 1,
                                'componentes': [{'turma': str(i), 'disciplina': 'A'}]} for i in range(3)]})

    def test_maximum_nights_does_not_force_exact_number(self):
        result = solve({'total_slots': 10,
                        'professores': [{'id': 'p', 'disponiveis': list(range(10)), 'max_noites': 3}],
                        'ofertas': [{'id': 'a', 'professor': 'p', 'blocos': 1,
                                     'componentes': [{'turma': 'ADS1', 'disciplina': 'A'}]}]})['aulas']
        self.assertEqual(len(result), 1)

    def test_shared_class_counts_once_and_blocks_both_groups(self):
        config = {'total_slots': 2, 'professores': [
            {'id': 'p', 'disponiveis': [0, 1]}, {'id': 'q', 'disponiveis': [0, 1]}],
            'ofertas': [
                {'id': 'clone', 'professor': 'p', 'blocos': 1, 'componentes': [
                    {'turma': 'ADS3', 'disciplina': 'A'}, {'turma': 'EDC3', 'disciplina': 'B'}]},
                {'id': 'other', 'professor': 'q', 'blocos': 1, 'componentes': [
                    {'turma': 'EDC3', 'disciplina': 'C'}]}]}
        result = solve(config)['aulas']
        self.assertEqual(len(result), 2)
        self.assertNotEqual(result[0]['slot'], result[1]['slot'])

    def test_unavailable_teacher_is_infeasible(self):
        with self.assertRaisesRegex(ValueError, 'Não existe horário'):
            solve({'total_slots': 1, 'professores': [{'id': 'p', 'disponiveis': []}],
                   'ofertas': [{'id': 'a', 'professor': 'p', 'blocos': 1,
                                'componentes': [{'turma': 'ADS1', 'disciplina': 'A'}]}]})


if __name__ == '__main__':
    unittest.main()
